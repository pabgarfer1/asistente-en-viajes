(function () {
	const state = {
		simulatedTime: new Date(),
		isPlaying: false,
		timeScale: 10,
		jsonFrequencyHz: 5,
		speedMultiplier: 1,
		followUser: false,
		route: null,
		routeCoordinates: [],
		segmentSpeeds: [],
		currentSegmentIndex: 0,
		segmentProgressMeters: 0,
		destination: null,
		destinationQuery: "",
		snapshotLog: [],
		lastLogAt: 0,
		lastLivePublishAt: 0,
		pendingLiveSnapshot: null,
		user: {
			lat: 40.4168,
			lng: -3.7038,
			orientation: 0,
			speedKmh: 0,
			headingCardinal: "N"
		}
	};

	const SPEED_MULTIPLIER_MIN = 0.25;
	const SPEED_MULTIPLIER_MAX = 3;
	const SPEED_MULTIPLIER_STEP = 0.25;
	const ROUTE_CHECKPOINT_DISTANCE_KM = [8, 18, 30, 45, 65, 90, 120, 155, 195, 240, 290, 350];

	const LIVE_CHANNEL_NAME = "navigation-simulator-live";
	const LIVE_STORAGE_KEY = "navigation-simulator-live-snapshot";
	const liveSnapshotChannel = typeof BroadcastChannel === "function"
		? new BroadcastChannel(LIVE_CHANNEL_NAME)
		: null;
	let pendingPublishTimer = null;

	const ui = {
		connectionStatus: document.getElementById("connection-status"),
		simStatus: document.getElementById("sim-status"),
		playToggleBtn: document.getElementById("play-toggle-btn"),
		playToggleIcon: document.getElementById("play-toggle-icon"),
		userAddressInput: document.getElementById("user-address-input"),
		centerBtn: document.getElementById("center-btn"),
		positionReadout: document.getElementById("position-readout"),
		orientationCompass: document.getElementById("orientation-compass"),
		compassNeedle: document.getElementById("compass-needle"),
		orientationReadout: document.getElementById("orientation-readout"),
		speedometerNeedle: document.getElementById("speedometer-needle"),
		speedometerValue: document.getElementById("speedometer-value"),
		speedSlowerBtn: document.getElementById("speed-slower-btn"),
		speedResetBtn: document.getElementById("speed-reset-btn"),
		speedFasterBtn: document.getElementById("speed-faster-btn"),
		speedReadout: document.getElementById("speed-readout"),
		addressInput: document.getElementById("address-input"),
		destinationReadout: document.getElementById("destination-readout"),
		distanceReadout: document.getElementById("distance-readout"),
		timeInput: document.getElementById("time-input"),
		timeReadout: document.getElementById("time-readout"),
		timeScale: document.getElementById("time-scale"),
		timeScaleReadout: document.getElementById("time-scale-readout"),
		jsonFrequency: document.getElementById("json-frequency"),
		jsonFrequencyReadout: document.getElementById("json-frequency-readout"),
		jsonOutput: document.getElementById("json-output"),
		loadingPanel: document.getElementById("loading-panel"),
		loadingLabel: document.getElementById("loading-label"),
		loadingPercent: document.getElementById("loading-percent"),
		loadingTrack: document.querySelector(".loading-track"),
		loadingBar: document.getElementById("loading-bar")
	};

	const map = L.map("map", { zoomControl: false }).setView([state.user.lat, state.user.lng], 13);

	L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
		maxZoom: 19,
		attribution: "&copy; OpenStreetMap contributors"
	}).addTo(map);

	const carIcon = L.divIcon({
		className: "car-marker-shell",
		html: '<div class="car-sprite-marker"><span class="car-sprite-shadow"></span><span class="car-sprite car-sprite-primary is-active"></span><span class="car-sprite car-sprite-secondary"></span></div>',
		iconSize: [92, 92],
		iconAnchor: [46, 46]
	});

	const destinationIcon = L.divIcon({
		className: "destination-marker-shell",
		html: '<div class="destination-marker"><span class="destination-ring"></span><span class="destination-core"></span></div>',
		iconSize: [42, 42],
		iconAnchor: [21, 21]
	});

	const carMarker = L.marker([state.user.lat, state.user.lng], { draggable: true, icon: carIcon }).addTo(map);
	let destinationMarker = null;
	let routeLine = null;
	let lastAnimationFrame = null;
	let lastFrameTs = performance.now();

	const CAR_ASSET_ANGLES = Array.from({ length: 24 }, function (_, index) {
		return index * 15;
	});
	const processedCarAssetUrls = new Map();
	const STATIC_PROCESSED_CAR_ASSET_DIR = "../assets/car/";
	const CAR_RENDER_SIZE = 256;
	const CAR_TARGET_DIAGONAL = 208;
	const CAR_MAX_RENDER_WIDTH = 176;
	const CAR_MAX_RENDER_HEIGHT = 156;
	let loadingHideTimer = null;

	function setConnectionStatus(message) {
		if (ui.connectionStatus) {
			ui.connectionStatus.textContent = message;
		}
	}

	function setSimulationStatus(message) {
		if (ui.simStatus) {
			ui.simStatus.textContent = message;
		}
	}

	function showLoadingProgress(label, percent) {
		if (!ui.loadingPanel || !ui.loadingBar || !ui.loadingLabel || !ui.loadingPercent || !ui.loadingTrack) {
			return;
		}

		if (loadingHideTimer) {
			window.clearTimeout(loadingHideTimer);
			loadingHideTimer = null;
		}

		const clampedPercent = Math.max(0, Math.min(100, Math.round(percent)));
		ui.loadingPanel.classList.remove("is-hidden");
		ui.loadingPanel.setAttribute("aria-hidden", "false");
		ui.loadingLabel.textContent = label;
		ui.loadingPercent.textContent = clampedPercent + "%";
		ui.loadingTrack.setAttribute("aria-valuenow", String(clampedPercent));
		ui.loadingBar.style.width = clampedPercent + "%";
	}

	function hideLoadingProgress(delayMs) {
		if (!ui.loadingPanel) {
			return;
		}

		if (loadingHideTimer) {
			window.clearTimeout(loadingHideTimer);
		}

		loadingHideTimer = window.setTimeout(function () {
			ui.loadingPanel.classList.add("is-hidden");
			ui.loadingPanel.setAttribute("aria-hidden", "true");
			loadingHideTimer = null;
		}, typeof delayMs === "number" ? delayMs : 260);
	}

	function toCardinal(angle) {
		const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
		return directions[Math.round(angle / 45) % 8];
	}

	function formatDateTimeLocal(date) {
		const pad = function (value) {
			return String(value).padStart(2, "0");
		};

		return [
			date.getFullYear(),
			pad(date.getMonth() + 1),
			pad(date.getDate())
		].join("-") + "T" + [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join(":");
	}

	function formatDateTimeReadable(date) {
		const pad = function (value) {
			return String(value).padStart(2, "0");
		};

		return [
			date.getUTCFullYear(),
			pad(date.getUTCMonth() + 1),
			pad(date.getUTCDate())
		].join("-") + " " + [
			pad(date.getUTCHours()),
			pad(date.getUTCMinutes()),
			pad(date.getUTCSeconds())
		].join(":") + " UTC";
	}

	function toRadians(value) {
		return (value * Math.PI) / 180;
	}

	function toDegrees(value) {
		return (value * 180) / Math.PI;
	}

	function distanceMeters(a, b) {
		const earthRadius = 6371000;
		const deltaLat = toRadians(b.lat - a.lat);
		const deltaLng = toRadians(b.lng - a.lng);
		const lat1 = toRadians(a.lat);
		const lat2 = toRadians(b.lat);
		const sinLat = Math.sin(deltaLat / 2);
		const sinLng = Math.sin(deltaLng / 2);
		const haversine = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
		return 2 * earthRadius * Math.asin(Math.sqrt(haversine));
	}

	function bearingDegrees(from, to) {
		const lat1 = toRadians(from.lat);
		const lat2 = toRadians(to.lat);
		const deltaLng = toRadians(to.lng - from.lng);
		const y = Math.sin(deltaLng) * Math.cos(lat2);
		const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
		return (toDegrees(Math.atan2(y, x)) + 360) % 360;
	}

	function interpolatePosition(start, end, fraction) {
		return {
			lat: start.lat + (end.lat - start.lat) * fraction,
			lng: start.lng + (end.lng - start.lng) * fraction
		};
	}

	function describeRouteSpeed() {
		return state.speedMultiplier.toFixed(2) + "x";
	}

	function syncSpeedometer() {
		if (!ui.speedometerNeedle || !ui.speedometerValue) {
			return;
		}

		const cappedSpeed = Math.max(0, Math.min(240, state.user.speedKmh));
		const rotation = -62 + (cappedSpeed / 240) * 124;
		ui.speedometerNeedle.style.transform = "translateX(-50%) rotate(" + rotation.toFixed(1) + "deg)";
		ui.speedometerValue.textContent = state.user.speedKmh.toFixed(1) + " km/h";
	}

	function clampSpeedMultiplier(value) {
		const steppedValue = Math.round(value / SPEED_MULTIPLIER_STEP) * SPEED_MULTIPLIER_STEP;
		return Math.min(SPEED_MULTIPLIER_MAX, Math.max(SPEED_MULTIPLIER_MIN, Number(steppedValue.toFixed(2))));
	}

	function setSpeedMultiplier(nextValue) {
		state.speedMultiplier = clampSpeedMultiplier(nextValue);
		updateInputsFromState();
		renderJson();
		recordSnapshot(true);
	}

	function syncPlayToggleButton() {
		if (!ui.playToggleBtn || !ui.playToggleIcon) {
			return;
		}

		if (state.isPlaying) {
			ui.playToggleBtn.setAttribute("aria-label", "Pause simulation");
			ui.playToggleBtn.setAttribute("title", "Pause simulation");
			ui.playToggleIcon.innerHTML = '<path d="M7 6h4v12H7zM13 6h4v12h-4z" fill="currentColor"></path>';
			return;
		}

		ui.playToggleBtn.setAttribute("aria-label", "Play simulation");
		ui.playToggleBtn.setAttribute("title", "Play simulation");
		ui.playToggleIcon.innerHTML = '<path d="M8 6v12l10-6z" fill="currentColor"></path>';
	}

	function syncCenterButton() {
		if (!ui.centerBtn) {
			return;
		}

		ui.centerBtn.textContent = state.followUser ? "Center on user: On" : "Center on user: Off";
		ui.centerBtn.setAttribute("aria-pressed", String(state.followUser));
		ui.centerBtn.classList.toggle("is-active", state.followUser);
		ui.centerBtn.setAttribute(
			"title",
			state.followUser ? "Map follows the car while it moves" : "Enable automatic centering on the user"
		);
	}

	function remainingDistanceKm() {
		if (!state.routeCoordinates.length || !state.routeCoordinates[state.currentSegmentIndex + 1]) {
			return 0;
		}

		let remaining = 0;
		const currentStart = state.routeCoordinates[state.currentSegmentIndex];
		const currentEnd = state.routeCoordinates[state.currentSegmentIndex + 1];
		remaining += Math.max(0, distanceMeters(currentStart, currentEnd) - state.segmentProgressMeters);

		for (let index = state.currentSegmentIndex + 1; index < state.routeCoordinates.length - 1; index += 1) {
			remaining += distanceMeters(state.routeCoordinates[index], state.routeCoordinates[index + 1]);
		}

		return remaining / 1000;
	}

	function getSegmentSpeedKmh(index) {
		return (state.segmentSpeeds[index] || 30) * state.speedMultiplier;
	}

	function buildRouteSnapshotContext(snapshotTimestamp) {
		if (!state.routeCoordinates.length || !state.routeCoordinates[state.currentSegmentIndex + 1] || !state.destination) {
			return null;
		}

		const thresholdDistancesMeters = ROUTE_CHECKPOINT_DISTANCE_KM
			.map(function (distanceKmValue) {
				return distanceKmValue * 1000;
			})
			.filter(function (distanceMetersValue) {
				return distanceMetersValue < remainingDistanceKm() * 1000;
			});
		const checkpoints = [];
		let thresholdIndex = 0;
		let distanceFromUserMeters = 0;
		let durationFromUserSeconds = 0;

		for (let index = state.currentSegmentIndex; index < state.routeCoordinates.length - 1; index += 1) {
			const segmentStart = state.routeCoordinates[index];
			const segmentEnd = state.routeCoordinates[index + 1];
			const fullSegmentDistanceMeters = distanceMeters(segmentStart, segmentEnd);
			const segmentOffsetMeters = index === state.currentSegmentIndex ? state.segmentProgressMeters : 0;
			const segmentRemainingMeters = Math.max(0, fullSegmentDistanceMeters - segmentOffsetMeters);

			if (segmentRemainingMeters <= 0) {
				continue;
			}

			const segmentSpeedKmh = getSegmentSpeedKmh(index);
			const segmentSpeedMps = Math.max(1, segmentSpeedKmh / 3.6);

			while (thresholdIndex < thresholdDistancesMeters.length && distanceFromUserMeters + segmentRemainingMeters >= thresholdDistancesMeters[thresholdIndex]) {
				const metersIntoRemainingSegment = thresholdDistancesMeters[thresholdIndex] - distanceFromUserMeters;
				const fractionAlongSegment = fullSegmentDistanceMeters > 0
					? Math.min(1, Math.max(0, (segmentOffsetMeters + metersIntoRemainingSegment) / fullSegmentDistanceMeters))
					: 0;
				const checkpointPosition = interpolatePosition(segmentStart, segmentEnd, fractionAlongSegment);
				const etaSeconds = durationFromUserSeconds + (metersIntoRemainingSegment / segmentSpeedMps);

				checkpoints.push({
					position: {
						latitude: Number(checkpointPosition.lat.toFixed(6)),
						longitude: Number(checkpointPosition.lng.toFixed(6))
					},
					distanceFromUserKm: Number((thresholdDistancesMeters[thresholdIndex] / 1000).toFixed(1)),
					etaMinutes: Math.round(etaSeconds / 60),
					etaTimestamp: new Date(snapshotTimestamp.getTime() + etaSeconds * 1000).toISOString(),
					isDestination: false
				});

				thresholdIndex += 1;
			}

			distanceFromUserMeters += segmentRemainingMeters;
			durationFromUserSeconds += segmentRemainingMeters / segmentSpeedMps;
		}

		checkpoints.push({
			position: {
				latitude: Number(state.destination.lat.toFixed(6)),
				longitude: Number(state.destination.lng.toFixed(6))
			},
			distanceFromUserKm: Number((distanceFromUserMeters / 1000).toFixed(1)),
			etaMinutes: Math.round(durationFromUserSeconds / 60),
			etaTimestamp: new Date(snapshotTimestamp.getTime() + durationFromUserSeconds * 1000).toISOString(),
			isDestination: true
		});

		return {
			etaModel: "route-segment-speed-derived",
			remainingDurationMinutes: Math.round(durationFromUserSeconds / 60),
			checkpoints: checkpoints
		};
	}

	function snapshotPayload() {
		const snapshotTimestamp = new Date(state.simulatedTime);
		const routeContext = buildRouteSnapshotContext(snapshotTimestamp);
		return {
			timestamp: snapshotTimestamp.toISOString(),
			simulation: {
				playing: state.isPlaying,
				timeScale: state.timeScale,
				routeLoaded: Boolean(state.route),
				routeProgress: {
					currentSegmentIndex: state.currentSegmentIndex,
					remainingDistanceKm: Number(remainingDistanceKm().toFixed(3)),
					remainingDurationMinutes: routeContext ? routeContext.remainingDurationMinutes : 0
				}
			},
			user: {
				position: {
					latitude: Number(state.user.lat.toFixed(6)),
					longitude: Number(state.user.lng.toFixed(6))
				},
				speedKmh: Number(state.user.speedKmh.toFixed(2)),
				orientationDegrees: Number(state.user.orientation.toFixed(1)),
				orientationCardinal: state.user.headingCardinal
			},
			destination: state.destination ? {
				address: state.destination.label,
				latitude: Number(state.destination.lat.toFixed(6)),
				longitude: Number(state.destination.lng.toFixed(6))
			} : null,
			navigation: {
				headingTo: state.destination ? state.destination.label : null,
				pathMode: state.route ? "road_route" : "manual",
				speedMode: state.route ? "route_duration_derived" : "manual",
				routeContext: routeContext
			}
		};
	}

	function publishLiveSnapshot(snapshot) {
		const envelope = {
			source: "navigation-json-simulator",
			publishedAt: new Date().toISOString(),
			snapshot: snapshot
		};

		if (liveSnapshotChannel) {
			liveSnapshotChannel.postMessage(envelope);
		}

		try {
			window.localStorage.setItem(LIVE_STORAGE_KEY, JSON.stringify(envelope));
		} catch (error) {
			return;
		}
	}

	function getLivePublishIntervalMs() {
		return 1000 / Math.max(1, state.jsonFrequencyHz);
	}

	function flushPendingLiveSnapshot() {
		if (pendingPublishTimer) {
			window.clearTimeout(pendingPublishTimer);
			pendingPublishTimer = null;
		}

		if (!state.pendingLiveSnapshot) {
			return;
		}

		state.lastLivePublishAt = performance.now();
		publishLiveSnapshot(state.pendingLiveSnapshot);
		state.pendingLiveSnapshot = null;
	}

	function queueLiveSnapshot(snapshot, force) {
		state.pendingLiveSnapshot = snapshot;

		if (force) {
			flushPendingLiveSnapshot();
			return;
		}

		const intervalMs = getLivePublishIntervalMs();
		const elapsedMs = performance.now() - state.lastLivePublishAt;

		if (state.lastLivePublishAt === 0 || elapsedMs >= intervalMs) {
			flushPendingLiveSnapshot();
			return;
		}

		if (!pendingPublishTimer) {
			pendingPublishTimer = window.setTimeout(flushPendingLiveSnapshot, intervalMs - elapsedMs);
		}
	}

	function renderJson(forcePublish) {
		const snapshot = snapshotPayload();
		ui.jsonOutput.textContent = JSON.stringify(snapshot, null, 2);
		queueLiveSnapshot(snapshot, Boolean(forcePublish));
	}

	function recordSnapshot(force) {
		const now = state.simulatedTime.getTime();
		if (!force && now - state.lastLogAt < 1000) {
			return;
		}

		state.lastLogAt = now;
		state.snapshotLog.push(snapshotPayload());
	}

	function centerMapOnUser() {
		map.panTo([state.user.lat, state.user.lng], { animate: false });
	}

	function updateMarkerPosition() {
		carMarker.setLatLng([state.user.lat, state.user.lng]);
		if (state.followUser) {
			centerMapOnUser();
		}
	}

	function setUserPosition(lat, lng) {
		state.user.lat = lat;
		state.user.lng = lng;
		updateMarkerPosition();
		updateInputsFromState();
		renderJson();
		recordSnapshot(true);
	}

	function applyOrientation(angle) {
		state.user.orientation = ((angle % 360) + 360) % 360;
		state.user.headingCardinal = toCardinal(state.user.orientation);
		updateInputsFromState();
		renderJson();
	}

	function isEdgeBackgroundPixel(pixels, index) {
		return pixels[index + 3] > 0 && pixels[index] >= 238 && pixels[index + 1] >= 238 && pixels[index + 2] >= 238;
	}

	function removeEdgeConnectedWhite(imageData) {
		const width = imageData.width;
		const height = imageData.height;
		const data = imageData.data;
		const visited = new Uint8Array(width * height);
		const queue = [];
		let queueIndex = 0;

		function enqueue(x, y) {
			if (x < 0 || y < 0 || x >= width || y >= height) {
				return;
			}

			const visitIndex = y * width + x;
			if (visited[visitIndex]) {
				return;
			}

			const pixelIndex = visitIndex * 4;
			if (!isEdgeBackgroundPixel(data, pixelIndex)) {
				return;
			}

			visited[visitIndex] = 1;
			queue.push(visitIndex);
		}

		for (let x = 0; x < width; x += 1) {
			enqueue(x, 0);
			enqueue(x, height - 1);
		}

		for (let y = 1; y < height - 1; y += 1) {
			enqueue(0, y);
			enqueue(width - 1, y);
		}

		while (queueIndex < queue.length) {
			const visitIndex = queue[queueIndex];
			queueIndex += 1;
			const pixelIndex = visitIndex * 4;
			const x = visitIndex % width;
			const y = Math.floor(visitIndex / width);

			data[pixelIndex + 3] = 0;

			enqueue(x + 1, y);
			enqueue(x - 1, y);
			enqueue(x, y + 1);
			enqueue(x, y - 1);
		}
	}

	function getOpaqueBounds(imageData) {
		const width = imageData.width;
		const height = imageData.height;
		const data = imageData.data;
		let minX = width;
		let minY = height;
		let maxX = -1;
		let maxY = -1;

		for (let y = 0; y < height; y += 1) {
			for (let x = 0; x < width; x += 1) {
				const pixelIndex = (y * width + x) * 4;
				if (data[pixelIndex + 3] === 0) {
					continue;
				}

				minX = Math.min(minX, x);
				minY = Math.min(minY, y);
				maxX = Math.max(maxX, x);
				maxY = Math.max(maxY, y);
			}
		}

		if (maxX === -1 || maxY === -1) {
			return null;
		}

		return {
			x: minX,
			y: minY,
			width: maxX - minX + 1,
			height: maxY - minY + 1
		};
	}

	function renderNormalizedCarAsset(sourceCanvas, bounds) {
		const outputCanvas = document.createElement("canvas");
		const outputContext = outputCanvas.getContext("2d");
		if (!outputContext) {
			return sourceCanvas.toDataURL("image/png");
		}

		outputCanvas.width = CAR_RENDER_SIZE;
		outputCanvas.height = CAR_RENDER_SIZE;

		if (!bounds) {
			return outputCanvas.toDataURL("image/png");
		}

		const diagonal = Math.hypot(bounds.width, bounds.height) || 1;
		const scale = Math.min(
			CAR_TARGET_DIAGONAL / diagonal,
			CAR_MAX_RENDER_WIDTH / bounds.width,
			CAR_MAX_RENDER_HEIGHT / bounds.height
		);
		const drawWidth = bounds.width * scale;
		const drawHeight = bounds.height * scale;
		const drawX = (CAR_RENDER_SIZE - drawWidth) / 2;
		const drawY = (CAR_RENDER_SIZE - drawHeight) / 2;

		outputContext.drawImage(
			sourceCanvas,
			bounds.x,
			bounds.y,
			bounds.width,
			bounds.height,
			drawX,
			drawY,
			drawWidth,
			drawHeight
		);

		return outputCanvas.toDataURL("image/png");
	}

	function processCarAsset(angle) {
		const image = new Image();
		image.decoding = "async";

		image.addEventListener("load", function () {
			const canvas = document.createElement("canvas");
			const context = canvas.getContext("2d", { willReadFrequently: true });
			if (!context) {
				updateVehicleMarkerRotation();
				return;
			}

			canvas.width = image.width;
			canvas.height = image.height;
			context.drawImage(image, 0, 0);

			try {
				const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
				removeEdgeConnectedWhite(imageData);
				context.putImageData(imageData, 0, 0);
				processedCarAssetUrls.set(angle, renderNormalizedCarAsset(canvas, getOpaqueBounds(imageData)));
			} catch (error) {
				// Some file:// browsers block pixel reads from local images; use the preprocessed PNG fallback instead.
			}

			updateVehicleMarkerRotation();
		});

		image.addEventListener("error", function () {
			updateVehicleMarkerRotation();
		});

		image.src = "../assets/car/" + String(angle).padStart(3, "0") + ".png";
	}

	function preloadStaticProcessedCarAsset(angle) {
		const assetPath = STATIC_PROCESSED_CAR_ASSET_DIR + String(angle).padStart(3, "0") + ".png";
		const image = new Image();
		image.decoding = "async";

		image.addEventListener("load", function () {
			if (!processedCarAssetUrls.has(angle)) {
				processedCarAssetUrls.set(angle, assetPath);
			}
			updateVehicleMarkerRotation();
		});

		image.src = assetPath;
	}

	function preloadCarAssets() {
		CAR_ASSET_ANGLES.forEach(function (angle) {
			preloadStaticProcessedCarAsset(angle);
			processCarAsset(angle);
		});
	}

	function getVehicleAssetAngle(angle) {
		const normalized = ((angle % 360) + 360) % 360;
		return ((225 - Math.round(normalized / 15) * 15) + 360) % 360;
	}

	function updateVehicleMarkerRotation() {
		const markerElement = carMarker.getElement();
		if (!markerElement) {
			return;
		}

		const primarySprite = markerElement.querySelector(".car-sprite-primary");
		const secondarySprite = markerElement.querySelector(".car-sprite-secondary");
		if (!primarySprite || !secondarySprite) {
			return;
		}

		const assetAngle = getVehicleAssetAngle(state.user.orientation);
		const processedAssetUrl = processedCarAssetUrls.get(assetAngle);
		const fallbackAssetPath = STATIC_PROCESSED_CAR_ASSET_DIR + String(assetAngle).padStart(3, "0") + ".png";
		const nextAssetSource = processedAssetUrl || fallbackAssetPath;
		const activeSprite = markerElement.dataset.activeSprite === "secondary" ? secondarySprite : primarySprite;
		const inactiveSprite = activeSprite === primarySprite ? secondarySprite : primarySprite;

		if (activeSprite.dataset.assetSource === nextAssetSource) {
			return;
		}

		inactiveSprite.dataset.assetSource = nextAssetSource;
		inactiveSprite.style.backgroundImage = 'url("' + nextAssetSource + '")';
		inactiveSprite.classList.add("is-active");
		activeSprite.classList.remove("is-active");
		markerElement.dataset.activeSprite = activeSprite === primarySprite ? "secondary" : "primary";
	}

	function updateInputsFromState() {
		ui.positionReadout.textContent = state.user.lat.toFixed(6) + ", " + state.user.lng.toFixed(6);
		ui.compassNeedle.style.transform = "translateX(-50%) rotate(" + Math.round(state.user.orientation) + "deg)";
		ui.orientationReadout.textContent = Math.round(state.user.orientation) + "° (" + state.user.headingCardinal + ")";
		syncSpeedometer();
		if (ui.speedSlowerBtn) {
			ui.speedSlowerBtn.disabled = state.speedMultiplier <= SPEED_MULTIPLIER_MIN;
		}
		if (ui.speedFasterBtn) {
			ui.speedFasterBtn.disabled = state.speedMultiplier >= SPEED_MULTIPLIER_MAX;
		}
		if (ui.speedResetBtn) {
			ui.speedResetBtn.textContent = state.speedMultiplier.toFixed(2) + "x";
			ui.speedResetBtn.classList.toggle("is-active", state.speedMultiplier === 1);
		}
		if (ui.speedReadout) {
			ui.speedReadout.textContent = describeRouteSpeed();
		}
		ui.destinationReadout.textContent = state.destination ? state.destination.label : "Not set";
		ui.distanceReadout.textContent = remainingDistanceKm().toFixed(2) + " km";
		ui.timeInput.value = formatDateTimeLocal(state.simulatedTime);
		ui.timeReadout.textContent = formatDateTimeReadable(state.simulatedTime);
		ui.timeScale.value = String(state.timeScale);
		ui.timeScaleReadout.textContent = state.timeScale + "x";
		ui.jsonFrequency.value = String(state.jsonFrequencyHz);
		ui.jsonFrequencyReadout.textContent = state.jsonFrequencyHz + " per second";
		syncPlayToggleButton();
		syncCenterButton();
		updateVehicleMarkerRotation();
	}

	function setOrientationFromCompassEvent(event) {
		const rect = ui.orientationCompass.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		const deltaX = event.clientX - centerX;
		const deltaY = event.clientY - centerY;
		const angle = (Math.atan2(deltaX, -deltaY) * 180) / Math.PI;
		applyOrientation((angle + 360) % 360);
		recordSnapshot(true);
	}

	function drawRoute(coordinates) {
		if (routeLine) {
			routeLine.remove();
		}

		routeLine = L.polyline(coordinates.map(function (point) {
			return [point.lat, point.lng];
		}), {
			color: "#cd7a33",
			weight: 5,
			opacity: 0.92
		}).addTo(map);

		map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
	}

	function clearRoute() {
		state.route = null;
		state.routeCoordinates = [];
		state.segmentSpeeds = [];
		state.currentSegmentIndex = 0;
		state.segmentProgressMeters = 0;
		state.destination = null;
		state.user.speedKmh = 0;

		if (routeLine) {
			routeLine.remove();
			routeLine = null;
		}

		if (destinationMarker) {
			destinationMarker.remove();
			destinationMarker = null;
		}

		updateInputsFromState();
		renderJson();
		recordSnapshot(true);
		setSimulationStatus(state.isPlaying ? "Simulation running" : "Simulation paused");
	}

	function downloadJson(filename, data) {
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = filename;
		link.click();
		URL.revokeObjectURL(link.href);
	}

	async function geocodeAddress(query) {
		try {
			const photonResponse = await fetch(
				"https://photon.komoot.io/api/?limit=1&q=" + encodeURIComponent(query),
				{ headers: { Accept: "application/json" } }
			);

			if (photonResponse.ok) {
				const photonPayload = await photonResponse.json();
				const feature = photonPayload && photonPayload.features && photonPayload.features[0];
				if (feature && feature.geometry && Array.isArray(feature.geometry.coordinates)) {
					const properties = feature.properties || {};
					const labelParts = [
						properties.name,
						properties.city,
						properties.county,
						properties.state,
						properties.country
					].filter(Boolean);

					return {
						lat: Number(feature.geometry.coordinates[1]),
						lng: Number(feature.geometry.coordinates[0]),
						label: labelParts.join(", ") || query
					};
				}
			}
		} catch (error) {
			// Fall through to the Nominatim fallback when Photon is blocked or unreachable.
		}

		const fallbackResponse = await fetch(
			"https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" + encodeURIComponent(query),
			{ headers: { Accept: "application/json" } }
		);

		if (!fallbackResponse.ok) {
			throw new Error("Geocoding failed with status " + fallbackResponse.status);
		}

		const fallbackResults = await fallbackResponse.json();
		if (!fallbackResults.length) {
			throw new Error("Address not found.");
		}

		return {
			lat: Number(fallbackResults[0].lat),
			lng: Number(fallbackResults[0].lon),
			label: fallbackResults[0].display_name
		};
	}

	async function loadRoute(destination) {
		const url = [
			"https://router.project-osrm.org/route/v1/driving/",
			state.user.lng + "," + state.user.lat + ";" + destination.lng + "," + destination.lat,
			"?overview=full&geometries=geojson&annotations=distance,duration"
		].join("");

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error("Routing failed with status " + response.status);
		}

		const payload = await response.json();
		const route = payload.routes && payload.routes[0];
		if (!route || !route.geometry || !route.legs || !route.legs[0]) {
			throw new Error("No route returned.");
		}

		const coordinates = route.geometry.coordinates.map(function (point) {
			return { lng: point[0], lat: point[1] };
		});
		const annotations = route.legs[0].annotation || { distance: [], duration: [] };
		const segmentSpeeds = annotations.distance.map(function (distance, index) {
			const duration = annotations.duration[index] || 1;
			return Math.max(8, (distance / duration) * 3.6);
		});

		return {
			route: route,
			coordinates: coordinates,
			segmentSpeeds: segmentSpeeds
		};
	}

	async function teleportToAddress() {
		const query = ui.userAddressInput.value.trim();
		if (!query) {
			setConnectionStatus("Enter a user address first.");
			return;
		}

		setConnectionStatus("Geocoding user teleport...");
		showLoadingProgress("Geocoding teleport address", 18);

		try {
			const location = await geocodeAddress(query);
			showLoadingProgress("Applying teleport position", 86);
			setUserPosition(location.lat, location.lng);
			state.currentSegmentIndex = 0;
			state.segmentProgressMeters = 0;
			centerMapOnUser();
			showLoadingProgress("Teleport complete", 100);
			setConnectionStatus("User teleported to " + location.label + ".");
			hideLoadingProgress(420);
		} catch (error) {
			hideLoadingProgress(0);
			setConnectionStatus(error.message);
		}
	}

	async function routeToAddress() {
		const query = ui.addressInput.value.trim();
		if (!query) {
			setConnectionStatus("Enter an address first.");
			return;
		}

		setConnectionStatus("Geocoding destination...");
		showLoadingProgress("Geocoding destination", 14);

		try {
			const destination = await geocodeAddress(query);
			setConnectionStatus("Loading route...");
			showLoadingProgress("Calculating road route", 52);
			const routeData = await loadRoute(destination);

			state.destination = destination;
			state.destinationQuery = query;
			state.route = routeData.route;
			state.routeCoordinates = routeData.coordinates;
			state.segmentSpeeds = routeData.segmentSpeeds;
			state.currentSegmentIndex = 0;
			state.segmentProgressMeters = 0;

			if (destinationMarker) {
				destinationMarker.remove();
			}

			destinationMarker = L.marker([destination.lat, destination.lng], { icon: destinationIcon }).addTo(map);
			drawRoute(state.routeCoordinates);
			updateInputsFromState();
			renderJson();
			recordSnapshot(true);
			showLoadingProgress("Route ready", 100);
			setConnectionStatus("Route ready.");
			hideLoadingProgress(460);
		} catch (error) {
			hideLoadingProgress(0);
			setConnectionStatus(error.message);
		}
	}

	function setPlaying(nextIsPlaying) {
		state.isPlaying = nextIsPlaying;
		if (nextIsPlaying) {
			setSimulationStatus("Simulation running");
		} else {
			setSimulationStatus("Simulation paused");
			state.user.speedKmh = 0;
			updateInputsFromState();
			renderJson();
		}

		syncPlayToggleButton();
		recordSnapshot(true);
	}

	function advanceSimulation(simulatedSeconds) {
		if (!state.routeCoordinates.length || state.currentSegmentIndex >= state.routeCoordinates.length - 1) {
			state.user.speedKmh = 0;
			return;
		}

		let remainingMetersToTravel = simulatedSeconds;

		while (remainingMetersToTravel > 0 && state.currentSegmentIndex < state.routeCoordinates.length - 1) {
			const current = state.routeCoordinates[state.currentSegmentIndex];
			const next = state.routeCoordinates[state.currentSegmentIndex + 1];
			const segmentDistance = distanceMeters(current, next);
			const segmentSpeedKmh = (state.segmentSpeeds[state.currentSegmentIndex] || 30) * state.speedMultiplier;
			const segmentSpeedMps = segmentSpeedKmh / 3.6;
			const travelMetersThisLoop = segmentSpeedMps * remainingMetersToTravel;
			const remainingSegmentMeters = segmentDistance - state.segmentProgressMeters;
			state.user.speedKmh = segmentSpeedKmh;

			if (travelMetersThisLoop < remainingSegmentMeters) {
				state.segmentProgressMeters += travelMetersThisLoop;
				const fraction = state.segmentProgressMeters / segmentDistance;
				const position = interpolatePosition(current, next, fraction);
				setUserPosition(position.lat, position.lng);
				applyOrientation(bearingDegrees(current, next));
				remainingMetersToTravel = 0;
			} else {
				remainingMetersToTravel -= remainingSegmentMeters / segmentSpeedMps;
				state.currentSegmentIndex += 1;
				state.segmentProgressMeters = 0;
				setUserPosition(next.lat, next.lng);
				applyOrientation(bearingDegrees(current, next));
			}
		}

		if (state.currentSegmentIndex >= state.routeCoordinates.length - 1) {
			state.user.speedKmh = 0;
			state.isPlaying = false;
			setSimulationStatus("Arrived at destination");
			syncPlayToggleButton();
		}
	}

	function tick(frameTs) {
		const elapsedSeconds = Math.min((frameTs - lastFrameTs) / 1000, 0.5);
		lastFrameTs = frameTs;

		if (state.isPlaying) {
			const simulatedSeconds = elapsedSeconds * state.timeScale;
			state.simulatedTime = new Date(state.simulatedTime.getTime() + simulatedSeconds * 1000);
			advanceSimulation(simulatedSeconds);
			updateInputsFromState();
			renderJson();
			recordSnapshot(false);
		}

		lastAnimationFrame = requestAnimationFrame(tick);
	}

	function bindEvents() {
		document.getElementById("teleport-btn").addEventListener("click", teleportToAddress);

		ui.userAddressInput.addEventListener("keydown", function (event) {
			if (event.key === "Enter") {
				event.preventDefault();
				teleportToAddress();
			}
		});

		ui.centerBtn.addEventListener("click", function () {
			state.followUser = !state.followUser;
			syncCenterButton();
			if (state.followUser) {
				centerMapOnUser();
			}
			renderJson();
			recordSnapshot(true);
		});

		ui.orientationCompass.addEventListener("click", setOrientationFromCompassEvent);

		ui.speedSlowerBtn.addEventListener("click", function () {
			setSpeedMultiplier(state.speedMultiplier - SPEED_MULTIPLIER_STEP);
		});

		ui.speedResetBtn.addEventListener("click", function () {
			setSpeedMultiplier(1);
		});

		ui.speedFasterBtn.addEventListener("click", function () {
			setSpeedMultiplier(state.speedMultiplier + SPEED_MULTIPLIER_STEP);
		});

		document.getElementById("route-btn").addEventListener("click", routeToAddress);
		document.getElementById("clear-route-btn").addEventListener("click", clearRoute);

		ui.addressInput.addEventListener("keydown", function (event) {
			if (event.key === "Enter") {
				event.preventDefault();
				routeToAddress();
			}
		});

		ui.timeInput.addEventListener("change", function (event) {
			const value = new Date(event.target.value);
			if (!Number.isNaN(value.getTime())) {
				state.simulatedTime = value;
				updateInputsFromState();
				renderJson();
				recordSnapshot(true);
			}
		});

		ui.timeScale.addEventListener("input", function (event) {
			state.timeScale = Number(event.target.value);
			updateInputsFromState();
			renderJson();
		});

		ui.jsonFrequency.addEventListener("input", function (event) {
			const nextValue = Math.min(30, Math.max(1, Number(event.target.value) || 1));
			state.jsonFrequencyHz = nextValue;
			updateInputsFromState();
			if (state.pendingLiveSnapshot) {
				queueLiveSnapshot(state.pendingLiveSnapshot, false);
			} else {
				renderJson(true);
			}
		});

		ui.playToggleBtn.addEventListener("click", function () {
			setPlaying(!state.isPlaying);
		});

		document.getElementById("download-current-btn").addEventListener("click", function () {
			downloadJson("navigation-snapshot.json", snapshotPayload());
		});

		document.getElementById("download-log-btn").addEventListener("click", function () {
			downloadJson("navigation-log.json", {
				createdAt: new Date().toISOString(),
				samples: state.snapshotLog
			});
		});

		document.getElementById("reset-log-btn").addEventListener("click", function () {
			state.snapshotLog = [];
			state.lastLogAt = 0;
			recordSnapshot(true);
			setConnectionStatus("Recorded log reset.");
		});

		carMarker.on("dragend", function (event) {
			const position = event.target.getLatLng();
			setUserPosition(position.lat, position.lng);
			state.currentSegmentIndex = 0;
			state.segmentProgressMeters = 0;
			setConnectionStatus("User moved manually. Re-route if needed.");
		});

		map.on("click", function (event) {
			if (!event.originalEvent.shiftKey) {
				return;
			}

			setUserPosition(event.latlng.lat, event.latlng.lng);
			setConnectionStatus("Teleported user to clicked point.");
		});
	}

	function initialize() {
		setConnectionStatus("Map ready. Requires internet for tiles, routing, and geocoding.");
		setSimulationStatus("Simulation paused");
		preloadCarAssets();
		updateInputsFromState();
		renderJson(true);
		recordSnapshot(true);
		bindEvents();
		lastAnimationFrame = requestAnimationFrame(tick);
	}

	window.addEventListener("beforeunload", function () {
		if (pendingPublishTimer) {
			window.clearTimeout(pendingPublishTimer);
		}

		if (lastAnimationFrame) {
			cancelAnimationFrame(lastAnimationFrame);
		}
	});

	initialize();
})();
