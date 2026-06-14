
(function () {
	const LIVE_CHANNEL_NAME = "navigation-simulator-live";
	const LIVE_STORAGE_KEY = "navigation-simulator-live-snapshot";
	const PROCESSED_OUTPUT_CHANNEL_NAME = "navigation-processed-output";
	const PROCESSED_OUTPUT_STORAGE_KEY = "navigation-processed-output-payload";
	const PHOTON_REVERSE_URL = "https://photon.komoot.io/reverse";
	const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
	const DEFAULT_ANALYSIS_INTERVAL_MS = 10000;
	const DEFAULT_ROUTE_SPEED_KMH = 88;
	const REVERSE_LOOKUP_TIMEOUT_MS = 2500;
	const LOCAL_CITY_CAPTURE_RADIUS_KM = 35;
	const LOCAL_ROUTE_CITY_MATCH_RADIUS_KM = 22;
	const LOCAL_CITY_CATALOG = [
		{ name: "Madrid", latitude: 40.4168, longitude: -3.7038 },
		{ name: "Getafe", latitude: 40.3083, longitude: -3.7327 },
		{ name: "Leganes", latitude: 40.3270, longitude: -3.7635 },
		{ name: "Mostoles", latitude: 40.3223, longitude: -3.8649 },
		{ name: "Alcala de Henares", latitude: 40.4810, longitude: -3.3640 },
		{ name: "Guadalajara", latitude: 40.6333, longitude: -3.1667 },
		{ name: "Toledo", latitude: 39.8628, longitude: -4.0273 },
		{ name: "Talavera de la Reina", latitude: 39.9606, longitude: -4.8306 },
		{ name: "Ciudad Real", latitude: 38.9848, longitude: -3.9274 },
		{ name: "Puertollano", latitude: 38.6860, longitude: -4.1121 },
		{ name: "Cuenca", latitude: 40.0704, longitude: -2.1374 },
		{ name: "Albacete", latitude: 38.9942, longitude: -1.8585 },
		{ name: "Salamanca", latitude: 40.9701, longitude: -5.6635 },
		{ name: "Avila", latitude: 40.6566, longitude: -4.6812 },
		{ name: "Segovia", latitude: 40.9429, longitude: -4.1088 },
		{ name: "Valladolid", latitude: 41.6523, longitude: -4.7245 },
		{ name: "Zamora", latitude: 41.5033, longitude: -5.7446 },
		{ name: "Leon", latitude: 42.5987, longitude: -5.5671 },
		{ name: "Caceres", latitude: 39.4762, longitude: -6.3722 },
		{ name: "Trujillo", latitude: 39.4606, longitude: -5.8817 },
		{ name: "Merida", latitude: 38.9175, longitude: -6.3444 },
		{ name: "Badajoz", latitude: 38.8794, longitude: -6.9707 },
		{ name: "Zafra", latitude: 38.4250, longitude: -6.4167 },
		{ name: "Huelva", latitude: 37.2614, longitude: -6.9447 },
		{ name: "Seville", latitude: 37.3891, longitude: -5.9845 },
		{ name: "Dos Hermanas", latitude: 37.2829, longitude: -5.9209 },
		{ name: "Cordoba", latitude: 37.8882, longitude: -4.7794 },
		{ name: "Jaen", latitude: 37.7796, longitude: -3.7849 },
		{ name: "Granada", latitude: 37.1773, longitude: -3.5986 },
		{ name: "Malaga", latitude: 36.7213, longitude: -4.4214 },
		{ name: "Cadiz", latitude: 36.5271, longitude: -6.2886 },
		{ name: "Jerez de la Frontera", latitude: 36.6850, longitude: -6.1261 },
		{ name: "Algeciras", latitude: 36.1408, longitude: -5.4562 },
		{ name: "Valencia", latitude: 39.4699, longitude: -0.3763 },
		{ name: "Castellon de la Plana", latitude: 39.9864, longitude: -0.0513 },
		{ name: "Alicante", latitude: 38.3452, longitude: -0.4810 },
		{ name: "Murcia", latitude: 37.9922, longitude: -1.1307 },
		{ name: "Zaragoza", latitude: 41.6488, longitude: -0.8891 },
		{ name: "Barcelona", latitude: 41.3874, longitude: 2.1686 },
		{ name: "Tarragona", latitude: 41.1189, longitude: 1.2445 },
		{ name: "Girona", latitude: 41.9794, longitude: 2.8214 },
		{ name: "Bilbao", latitude: 43.2630, longitude: -2.9350 },
		{ name: "San Sebastian", latitude: 43.3183, longitude: -1.9812 },
		{ name: "Vitoria-Gasteiz", latitude: 42.8467, longitude: -2.6716 },
		{ name: "Santander", latitude: 43.4623, longitude: -3.8099 },
		{ name: "Pamplona", latitude: 42.8125, longitude: -1.6458 },
		{ name: "Logrono", latitude: 42.4627, longitude: -2.4449 },
		{ name: "Soria", latitude: 41.7660, longitude: -2.4790 },
		{ name: "Teruel", latitude: 40.3441, longitude: -1.1069 },
		{ name: "A Coruna", latitude: 43.3623, longitude: -8.4115 },
		{ name: "Santiago de Compostela", latitude: 42.8782, longitude: -8.5448 },
		{ name: "Lugo", latitude: 43.0097, longitude: -7.5568 },
		{ name: "Ourense", latitude: 42.3358, longitude: -7.8639 },
		{ name: "Vigo", latitude: 42.2406, longitude: -8.7207 },
		{ name: "Pontevedra", latitude: 42.4310, longitude: -8.6444 },
		{ name: "Oviedo", latitude: 43.3619, longitude: -5.8494 },
		{ name: "Gijon", latitude: 43.5322, longitude: -5.6611 }
	];

	const ui = {
		reconnectBtn: document.getElementById("reconnect-btn"),
		resetSessionBtn: document.getElementById("reset-session-btn"),
		copyProcessedJsonBtn: document.getElementById("copy-processed-json-btn"),
		inputStatus: document.getElementById("input-status"),
		resultStatus: document.getElementById("result-status"),
		transportReadout: document.getElementById("transport-readout"),
		messageCountReadout: document.getElementById("message-count-readout"),
		lastSimulatorTimeReadout: document.getElementById("last-simulator-time-readout"),
		lastReceivedReadout: document.getElementById("last-received-readout"),
		analysisFrequency: document.getElementById("analysis-frequency"),
		analysisSinceReadout: document.getElementById("analysis-since-readout"),
		analysisNextReadout: document.getElementById("analysis-next-readout"),
		analysisProgressTrack: document.querySelector(".analysis-progress-track"),
		analysisProgressBar: document.getElementById("analysis-progress-bar"),
		summaryGrid: document.getElementById("summary-grid"),
		logOutput: document.getElementById("log-output"),
		logCount: document.getElementById("log-count"),
		rawJson: document.getElementById("raw-json"),
		processedJson: document.getElementById("processed-json"),
		downloadJsonBtn: document.getElementById("download-json-btn"),
		downloadLogBtn: document.getElementById("download-log-btn")
	};

	const state = {
		lastResult: null,
		messageCount: 0,
		logs: [],
		channel: null,
		pollTimer: null,
		lastStorageValue: null,
		sessionStartedAt: new Date().toISOString(),
		lastEnvelope: null,
		lastAcceptedSignature: null,
		transportMode: "not-connected",
		processingRequestId: 0,
		cityLookupCache: new Map(),
		reverseLookupCache: new Map(),
		lastCityContextSignature: null,
		photonCooldownUntil: 0,
		reverseGeocodeCooldownUntil: 0,
		analysisIntervalMs: DEFAULT_ANALYSIS_INTERVAL_MS,
		lastProcessedSimulatorTimestampMs: null,
		latestSimulatorTimestampMs: null,
		processedSampleCount: 0,
		isProcessingSample: false
	};

	const processedOutputChannel = typeof BroadcastChannel === "function"
		? new BroadcastChannel(PROCESSED_OUTPUT_CHANNEL_NAME)
		: null;

	function setStatus(element, text, tone) {
		element.textContent = text;
		element.className = "status-chip" + (tone ? " " + tone : "");
	}

	function downloadText(filename, content, mimeType) {
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = filename;
		link.click();
		URL.revokeObjectURL(url);
	}

	async function copyTextToClipboard(value) {
		const text = value == null ? "" : String(value);

		if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
			await navigator.clipboard.writeText(text);
			return;
		}

		const textarea = document.createElement("textarea");
		textarea.value = text;
		textarea.setAttribute("readonly", "readonly");
		textarea.style.position = "fixed";
		textarea.style.opacity = "0";
		document.body.appendChild(textarea);
		textarea.select();

		try {
			document.execCommand("copy");
		} finally {
			document.body.removeChild(textarea);
		}
	}

	function setCopyButtonLabel(label) {
		if (!ui.copyProcessedJsonBtn) {
			return;
		}

		ui.copyProcessedJsonBtn.textContent = label;
	}

	function publishProcessedOutputPayload(payload) {
		if (processedOutputChannel) {
			processedOutputChannel.postMessage(payload);
		}

		try {
			window.localStorage.setItem(PROCESSED_OUTPUT_STORAGE_KEY, JSON.stringify(payload));
		} catch (error) {
			return;
		}
	}

	function pushLog(logs, level, code, message, context) {
		logs.push({
			level: level,
			code: code,
			message: message,
			context: context || null
		});
	}

	function formatIsoOrFallback(value) {
		if (!value) {
			return "Waiting";
		}

		const date = new Date(value);
		if (Number.isNaN(date.getTime())) {
			return String(value);
		}

		return date.toISOString();
	}

	function formatIntervalLabel(intervalMs) {
		if (intervalMs % 3600000 === 0) {
			const hours = intervalMs / 3600000;
			return hours + " hour" + (hours === 1 ? "" : "s");
		}

		if (intervalMs % 60000 === 0) {
			const minutes = intervalMs / 60000;
			return minutes + " minute" + (minutes === 1 ? "" : "s");
		}

		const seconds = intervalMs / 1000;
		return seconds + " second" + (seconds === 1 ? "" : "s");
	}

	function formatElapsedDuration(durationMs) {
		if (!Number.isFinite(durationMs) || durationMs <= 0) {
			return "0s";
		}

		const totalSeconds = Math.floor(durationMs / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		if (hours > 0) {
			return hours + "h " + String(minutes).padStart(2, "0") + "m";
		}

		if (minutes > 0) {
			return minutes + "m " + String(seconds).padStart(2, "0") + "s";
		}

		return seconds + "s";
	}

	function updateAnalysisProgress(snapshotTimestampMs) {
		if (Number.isFinite(snapshotTimestampMs)) {
			state.latestSimulatorTimestampMs = snapshotTimestampMs;
		}

		const latestTimestampMs = state.latestSimulatorTimestampMs;
		const lastProcessedTimestampMs = state.lastProcessedSimulatorTimestampMs;

		if (!ui.analysisSinceReadout || !ui.analysisNextReadout || !ui.analysisProgressBar || !ui.analysisProgressTrack) {
			return;
		}

		if (!Number.isFinite(latestTimestampMs)) {
			ui.analysisSinceReadout.textContent = "Since last analysis: Waiting";
			ui.analysisNextReadout.textContent = "Next analysis: Ready on next sample";
			ui.analysisProgressBar.style.width = "0%";
			ui.analysisProgressTrack.setAttribute("aria-valuenow", "0");
			return;
		}

		if (!Number.isFinite(lastProcessedTimestampMs)) {
			ui.analysisSinceReadout.textContent = "Since last analysis: Not started";
			ui.analysisNextReadout.textContent = "Next analysis: Ready on next sample";
			ui.analysisProgressBar.style.width = "100%";
			ui.analysisProgressTrack.setAttribute("aria-valuenow", "100");
			return;
		}

		const elapsedMs = Math.max(0, latestTimestampMs - lastProcessedTimestampMs);
		const remainingMs = Math.max(0, state.analysisIntervalMs - elapsedMs);
		const progress = Math.max(0, Math.min(1, elapsedMs / state.analysisIntervalMs));
		const progressPercent = Math.round(progress * 100);

		ui.analysisSinceReadout.textContent = "Since last analysis: " + formatElapsedDuration(elapsedMs);
		ui.analysisNextReadout.textContent = remainingMs > 0
			? "Next analysis: in " + formatElapsedDuration(remainingMs)
			: "Next analysis: Ready now";
		ui.analysisProgressBar.style.width = progressPercent + "%";
		ui.analysisProgressTrack.setAttribute("aria-valuenow", String(progressPercent));
	}

	function isLoadingStateValue(value) {
		return value === "Waiting" || value === "starting" || value === "Starting…";
	}

	function buildLoadingMarkup(label) {
		return '<span class="summary-loading summary-loading-inline"><strong>' + label + '</strong><span class="summary-loading-track" aria-hidden="true"><span class="summary-loading-bar"></span></span></span>';
	}

	function setReadoutValue(element, value) {
		if (!element) {
			return;
		}

		const displayValue = value == null ? "Waiting" : String(value);
		if (isLoadingStateValue(displayValue)) {
			element.innerHTML = buildLoadingMarkup(displayValue);
			return;
		}

		element.textContent = displayValue;
	}

	function updateIncomingTransportReadouts(snapshot, publishedAt) {
		setReadoutValue(ui.messageCountReadout, String(state.messageCount));
		setReadoutValue(ui.transportReadout, state.transportMode);
		setReadoutValue(ui.lastSimulatorTimeReadout, formatIsoOrFallback(snapshot && snapshot.timestamp ? snapshot.timestamp : null));
		setReadoutValue(ui.lastReceivedReadout, formatIsoOrFallback(publishedAt || null));
	}

	function updateIncomingSnapshotPreview(snapshot) {
		ui.rawJson.textContent = JSON.stringify(snapshot || {
			status: "waiting-for-live-snapshot"
		}, null, 2);
	}

	function shouldProcessSnapshot(snapshotTimestampMs) {
		if (!Number.isFinite(snapshotTimestampMs)) {
			return true;
		}

		if (state.lastProcessedSimulatorTimestampMs === null) {
			return true;
		}

		if (snapshotTimestampMs < state.lastProcessedSimulatorTimestampMs) {
			return true;
		}

		return snapshotTimestampMs - state.lastProcessedSimulatorTimestampMs >= state.analysisIntervalMs;
	}

	function toRadians(value) {
		return (value * Math.PI) / 180;
	}

	function toDegrees(value) {
		return (value * 180) / Math.PI;
	}

	function distanceKm(a, b) {
		const earthRadiusKm = 6371;
		const deltaLat = toRadians(b.latitude - a.latitude);
		const deltaLng = toRadians(b.longitude - a.longitude);
		const lat1 = toRadians(a.latitude);
		const lat2 = toRadians(b.latitude);
		const sinLat = Math.sin(deltaLat / 2);
		const sinLng = Math.sin(deltaLng / 2);
		const haversine = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
		return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
	}

	function bearingDegrees(from, to) {
		const lat1 = toRadians(from.latitude);
		const lat2 = toRadians(to.latitude);
		const deltaLng = toRadians(to.longitude - from.longitude);
		const y = Math.sin(deltaLng) * Math.cos(lat2);
		const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
		return (toDegrees(Math.atan2(y, x)) + 360) % 360;
	}

	function projectCoordinate(origin, bearingDeg, distanceKmValue) {
		const angularDistance = distanceKmValue / 6371;
		const bearing = toRadians(bearingDeg);
		const lat1 = toRadians(origin.latitude);
		const lng1 = toRadians(origin.longitude);
		const sinLat1 = Math.sin(lat1);
		const cosLat1 = Math.cos(lat1);
		const sinAngular = Math.sin(angularDistance);
		const cosAngular = Math.cos(angularDistance);

		const lat2 = Math.asin(sinLat1 * cosAngular + cosLat1 * sinAngular * Math.cos(bearing));
		const lng2 = lng1 + Math.atan2(
			Math.sin(bearing) * sinAngular * cosLat1,
			cosAngular - sinLat1 * Math.sin(lat2)
		);

		return {
			latitude: toDegrees(lat2),
			longitude: ((toDegrees(lng2) + 540) % 360) - 180
		};
	}

	function roundCoordinate(value, digits) {
		return Number(value).toFixed(digits);
	}

	function createCoordinateKey(position) {
		return roundCoordinate(position.latitude, 1) + "," + roundCoordinate(position.longitude, 1);
	}

	function uniqueStrings(values) {
		const seen = new Set();
		return values.filter(function (value) {
			if (!value || seen.has(value)) {
				return false;
			}
			seen.add(value);
			return true;
		});
	}

	function uniqueCityEntries(entries) {
		const seen = new Set();
		return entries.filter(function (entry) {
			if (!entry || !entry.name || seen.has(entry.name)) {
				return false;
			}
			seen.add(entry.name);
			return true;
		});
	}

	function createLookupCacheKey(position) {
		return roundCoordinate(position.latitude, 3) + "," + roundCoordinate(position.longitude, 3);
	}

	function distanceKmToCatalogCity(position, city) {
		return distanceKm(position, {
			latitude: city.latitude,
			longitude: city.longitude
		});
	}

	function findNearestLocalCity(position, excludedNames) {
		const blockedNames = excludedNames || new Set();
		const candidates = LOCAL_CITY_CATALOG
			.filter(function (city) {
				return !blockedNames.has(city.name);
			})
			.map(function (city) {
				return {
					name: city.name,
					distanceKm: distanceKmToCatalogCity(position, city)
				};
			})
			.filter(function (entry) {
				return entry.distanceKm <= LOCAL_CITY_CAPTURE_RADIUS_KM;
			})
			.sort(function (left, right) {
				return left.distanceKm - right.distanceKm;
			});

		return candidates[0] || null;
	}

	function buildLocalRouteCityEntries(routeCheckpoints, excludedNames) {
		const blockedNames = excludedNames || new Set();
		const matches = LOCAL_CITY_CATALOG.map(function (city) {
			if (blockedNames.has(city.name)) {
				return null;
			}

			let bestMatch = null;
			routeCheckpoints.forEach(function (checkpoint) {
				if (!checkpoint || checkpoint.isDestination || !checkpoint.position) {
					return;
				}

				const checkpointDistanceKm = distanceKm({
					latitude: checkpoint.position.latitude,
					longitude: checkpoint.position.longitude
				}, {
					latitude: city.latitude,
					longitude: city.longitude
				});

				if (!bestMatch || checkpointDistanceKm < bestMatch.checkpointDistanceKm) {
					bestMatch = {
						cityName: city.name,
						checkpoint: checkpoint,
						checkpointDistanceKm: checkpointDistanceKm
					};
				}
			});

			if (!bestMatch || bestMatch.checkpointDistanceKm > LOCAL_ROUTE_CITY_MATCH_RADIUS_KM) {
				return null;
			}

			return buildSnapshotCheckpointEta(bestMatch.checkpoint, bestMatch.cityName);
		}).filter(Boolean);

		return uniqueCityEntries(matches)
			.sort(function (left, right) {
				return left.distanceKm - right.distanceKm;
			});
	}

	function getCityLabel(address) {
		if (!address) {
			return null;
		}

		return address.city || address.town || address.village || address.municipality || address.county || address.state_district || address.state || null;
	}

	function getCityLabelFromAddressText(addressText) {
		if (!addressText) {
			return null;
		}

		return String(addressText)
			.split(",")
			.map(function (part) {
				return part.trim();
			})
			.find(function (part) {
				return part && !/spain|españa/i.test(part);
			}) || null;
	}

	function formatEtaDuration(minutesValue) {
		if (!Number.isFinite(minutesValue) || minutesValue < 1) {
			return "now";
		}

		if (minutesValue < 60) {
			return "~" + Math.round(minutesValue) + " min";
		}

		const hours = Math.floor(minutesValue / 60);
		const minutes = Math.round(minutesValue % 60);
		if (!minutes) {
			return "~" + hours + "h";
		}

		return "~" + hours + "h " + minutes + "m";
	}

	function estimateRouteSpeedKmh(snapshot) {
		const liveSpeedKmh = snapshot && snapshot.user && typeof snapshot.user.speedKmh === "number"
			? snapshot.user.speedKmh
			: 0;

		if (liveSpeedKmh >= 25) {
			return {
				speedKmh: liveSpeedKmh,
				source: "live-speed"
			};
		}

		return {
			speedKmh: DEFAULT_ROUTE_SPEED_KMH,
			source: "fallback-cruise-speed"
		};
	}

	function buildEtaEstimate(name, distanceFromUserKm, snapshotTimestampMs, speedModel) {
		const safeDistanceKm = Math.max(0, Number(distanceFromUserKm) || 0);
		const etaMinutes = speedModel.speedKmh > 0 ? (safeDistanceKm / speedModel.speedKmh) * 60 : null;
		const etaTimestamp = Number.isFinite(snapshotTimestampMs) && Number.isFinite(etaMinutes)
			? new Date(snapshotTimestampMs + etaMinutes * 60000).toISOString()
			: null;

		return {
			name: name,
			distanceKm: Number(safeDistanceKm.toFixed(1)),
			etaMinutes: Number.isFinite(etaMinutes) ? Math.round(etaMinutes) : null,
			etaLabel: formatEtaDuration(etaMinutes),
			etaTimestamp: etaTimestamp
		};
	}

	function formatCityEstimateLabel(entry) {
		if (!entry || !entry.name) {
			return null;
		}

		return entry.name + " (ETA " + entry.etaLabel + ")";
	}

	function escapeHtml(value) {
		return String(value)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/\"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}

	function formatEtaLocalClock(etaTimestamp) {
		if (!etaTimestamp) {
			return null;
		}

		const etaDate = new Date(etaTimestamp);
		if (Number.isNaN(etaDate.getTime())) {
			return null;
		}

		return etaDate.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false
		});
	}

	function formatEtaUtcDateMinute(etaTimestamp) {
		if (!etaTimestamp) {
			return null;
		}

		const etaDate = new Date(etaTimestamp);
		if (Number.isNaN(etaDate.getTime())) {
			return null;
		}

		return etaDate.toLocaleString("en-GB", {
			timeZone: "UTC",
			day: "2-digit",
			month: "long",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false
		}) + " UTC";
	}

	function buildCitySummaryMarkup(entries) {
		if (!entries || !entries.length) {
			return "Waiting";
		}

		return '<div class="summary-city-list">' + entries.map(function (entry) {
			const etaClock = formatEtaLocalClock(entry.etaTimestamp);
			const suffix = etaClock ? ' <span class="summary-city-eta">ETA ' + escapeHtml(etaClock) + '</span>' : "";
			return '<div class="summary-city-item"><span class="summary-city-name">' + escapeHtml(entry.name) + '</span>' + suffix + '</div>';
		}).join("") + '</div>';
	}

	function getLookupModeMessage(lookupMode, routeLoaded) {
		if (lookupMode === "provider-rate-limited") {
			return "City lookup paused by API rate limits";
		}

		if (lookupMode === "provider-unreachable") {
			return "City lookup provider unreachable";
		}

		if (lookupMode === "lookup-failed") {
			return "City lookup failed";
		}

		if (lookupMode === "no-position") {
			return "Position unavailable";
		}

		if (routeLoaded) {
			return "No route cities found yet";
		}

		return "No city data yet";
	}

	function buildProcessedOutputText(result) {
		const cityEntries = uniqueCityEntries((result.geography.closestCityEtas || []).concat(result.geography.aheadCityEtas || []))
			.sort(function (left, right) {
				return left.distanceKm - right.distanceKm;
			});

		if (!cityEntries.length) {
			return [
				"Cities and their ETAs",
				"",
				getLookupModeMessage(result.geography.lookupMode, Boolean(result.snapshot && result.snapshot.simulation && result.snapshot.simulation.routeLoaded)) + "."
			].join("\n");
		}

		return ["Cities and their ETAs", ""].concat(cityEntries.map(function (entry) {
			const etaUtc = formatEtaUtcDateMinute(entry.etaTimestamp) || "ETA unavailable";
			return "- " + entry.name + ", ETA " + etaUtc;
		})).join("\n");
	}

	function buildProcessedOutputPayload(result) {
		const outputText = buildProcessedOutputText(result);
		return {
			source: "navigation-route-city-finder",
			publishedAt: new Date().toISOString(),
			currentTimeUtc: result && result.snapshot && result.snapshot.timestamp ? result.snapshot.timestamp : null,
			processedOutputText: outputText,
			cityEntries: uniqueCityEntries((result.geography.closestCityEtas || []).concat(result.geography.aheadCityEtas || []))
				.sort(function (left, right) {
					return left.distanceKm - right.distanceKm;
				})
				.map(function (entry) {
					return {
						name: entry.name,
						etaUtc: entry.etaTimestamp || null,
						distanceKm: entry.distanceKm
					};
				}),
			status: result && result.processing ? result.processing.status : "waiting-for-route-city-data"
		};
	}

	function createCityJsonEntry(entry) {
		if (!entry || !entry.name) {
			return null;
		}

		return {
			name: entry.name,
			distanceKm: entry.distanceKm,
			etaUtc: entry.etaTimestamp || null
		};
	}

	function buildProcessedJsonView(result) {
		const snapshot = result && result.snapshot ? result.snapshot : {};
		return Object.assign({}, snapshot, {
			geography: {
				closestCities: (result.geography.closestCityEtas || []).map(createCityJsonEntry).filter(Boolean),
				aheadCities: (result.geography.aheadCityEtas || []).map(createCityJsonEntry).filter(Boolean),
				lookupMode: result.geography.lookupMode,
				remainingDistanceKm: result.geography.remainingDistanceKm,
				etaModel: result.geography.etaModel
			}
		});
	}

	function buildSnapshotCheckpointEta(checkpoint, cityName) {
		if (!checkpoint || !cityName) {
			return null;
		}

		return {
			name: cityName,
			distanceKm: Number((checkpoint.distanceFromUserKm || 0).toFixed(1)),
			etaMinutes: typeof checkpoint.etaMinutes === "number" ? checkpoint.etaMinutes : null,
			etaLabel: formatEtaDuration(checkpoint.etaMinutes),
			etaTimestamp: checkpoint.etaTimestamp || null
		};
	}

	function getAheadProbeDistances(remainingDistanceKm) {
		const distances = [
			12,
			32,
			70,
			120,
			180,
			remainingDistanceKm
		].filter(function (distanceKmValue) {
			return distanceKmValue > 0 && distanceKmValue < remainingDistanceKm;
		});

		return distances.filter(function (distanceKmValue, index, values) {
			return index === 0 || Math.abs(distanceKmValue - values[index - 1]) >= 12;
		});
	}

	async function fetchJsonWithTimeout(url) {
		const abortController = new AbortController();
		const timeoutId = window.setTimeout(function () {
			abortController.abort();
		}, REVERSE_LOOKUP_TIMEOUT_MS);

		try {
			const response = await fetch(url, {
				headers: {
					Accept: "application/json"
				},
				signal: abortController.signal
			});

			if (!response.ok) {
				const error = new Error("Lookup failed with status " + response.status);
				error.status = response.status;
				throw error;
			}

			return response.json();
		} catch (error) {
			if (error && error.name === "AbortError") {
				throw new Error("Lookup timed out");
			}

			throw error;
		} finally {
			window.clearTimeout(timeoutId);
		}
	}

	async function reverseGeocodeCity(position, options) {
		const allowFallback = !options || options.allowFallback !== false;
		const lookupCacheKey = createLookupCacheKey(position);
		const cachedLookup = state.reverseLookupCache.get(lookupCacheKey);
		if (cachedLookup && cachedLookup.expiresAt > Date.now()) {
			if (cachedLookup.errorCode) {
				const cachedError = new Error(cachedLookup.errorCode);
				cachedError.code = cachedLookup.errorCode;
				throw cachedError;
			}

			return cachedLookup.city;
		}

		const photonUrl = PHOTON_REVERSE_URL
			+ "?lat=" + encodeURIComponent(position.latitude)
			+ "&lon=" + encodeURIComponent(position.longitude)
			+ "&limit=1";

		if (Date.now() >= state.photonCooldownUntil) {
			try {
				const photonPayload = await fetchJsonWithTimeout(photonUrl);
				const feature = photonPayload && photonPayload.features && photonPayload.features[0];
				if (feature && feature.properties) {
					const photonCity = getCityLabel(feature.properties) || feature.properties.name || null;
					if (photonCity) {
						state.reverseLookupCache.set(lookupCacheKey, {
							city: photonCity,
							errorCode: null,
							expiresAt: Date.now() + 1800000
						});
						return photonCity;
					}
				}
			} catch (error) {
				if (error && !error.status) {
					state.photonCooldownUntil = Date.now() + 300000;
				}

				if (!allowFallback) {
					return null;
				}
			}
		}

		if (!allowFallback) {
			return null;
		}

		if (Date.now() < state.reverseGeocodeCooldownUntil) {
			const rateLimitError = new Error("City lookup cooling down after rate limit");
			rateLimitError.code = "provider-rate-limited";
			throw rateLimitError;
		}

		const url = NOMINATIM_REVERSE_URL
			+ "?format=jsonv2&addressdetails=1&zoom=10"
			+ "&lat=" + encodeURIComponent(position.latitude)
			+ "&lon=" + encodeURIComponent(position.longitude);

		try {
			const payload = await fetchJsonWithTimeout(url);
			const city = getCityLabel(payload.address);
			state.reverseLookupCache.set(lookupCacheKey, {
				city: city,
				errorCode: null,
				expiresAt: Date.now() + 1800000
			});
			return city;
		} catch (error) {
			if (error && error.status === 429) {
				state.reverseGeocodeCooldownUntil = Date.now() + 300000;
				state.reverseLookupCache.set(lookupCacheKey, {
					city: null,
					errorCode: "provider-rate-limited",
					expiresAt: state.reverseGeocodeCooldownUntil
				});
				error.code = "provider-rate-limited";
				throw error;
			}

			if (error && !error.status) {
				state.reverseLookupCache.set(lookupCacheKey, {
					city: null,
					errorCode: "provider-unreachable",
					expiresAt: Date.now() + 300000
				});
				error.code = "provider-unreachable";
			}
			throw error;
		}
	}

	function buildCityLookupCacheKey(snapshot) {
		const position = snapshot && snapshot.user ? snapshot.user.position : null;
		const destination = snapshot && snapshot.destination ? snapshot.destination : null;
		const speedKmh = snapshot && snapshot.user && typeof snapshot.user.speedKmh === "number"
			? snapshot.user.speedKmh
			: 0;
		const remainingDistanceKm = snapshot && snapshot.simulation && snapshot.simulation.routeProgress && typeof snapshot.simulation.routeProgress.remainingDistanceKm === "number"
			? snapshot.simulation.routeProgress.remainingDistanceKm
			: 0;
		if (!position) {
			return "no-position";
		}

		return [
			createCoordinateKey({ latitude: position.latitude, longitude: position.longitude }),
			destination ? createCoordinateKey({ latitude: destination.latitude, longitude: destination.longitude }) : "no-destination",
			snapshot && snapshot.simulation && snapshot.simulation.routeLoaded ? "route" : "manual",
			Math.floor(remainingDistanceKm / 25),
			Math.floor(speedKmh / 10)
		].join("|");
	}

	async function buildCityContext(snapshot) {
		const position = snapshot && snapshot.user ? snapshot.user.position : null;
		const destination = snapshot && snapshot.destination ? snapshot.destination : null;
		const routeContext = snapshot && snapshot.navigation ? snapshot.navigation.routeContext : null;
		if (!position) {
			return {
				closestCities: [],
				aheadCities: [],
				closestCityEtas: [],
				aheadCityEtas: [],
				lookupMode: "no-position"
			};
		}

		const currentPosition = {
			latitude: Number(position.latitude),
			longitude: Number(position.longitude)
		};
		const destinationPosition = destination ? {
			latitude: Number(destination.latitude),
			longitude: Number(destination.longitude)
		} : null;
		const routeLoaded = Boolean(snapshot && snapshot.simulation && snapshot.simulation.routeLoaded && destinationPosition);
		const routeCheckpoints = routeContext && Array.isArray(routeContext.checkpoints)
			? routeContext.checkpoints
			: null;
		const snapshotTimestampMs = snapshot && snapshot.timestamp ? Date.parse(snapshot.timestamp) : NaN;
		const speedModel = estimateRouteSpeedKmh(snapshot);
		const remainingDistanceKm = snapshot && snapshot.simulation && snapshot.simulation.routeProgress && typeof snapshot.simulation.routeProgress.remainingDistanceKm === "number"
			? snapshot.simulation.routeProgress.remainingDistanceKm
			: (destinationPosition ? distanceKm(currentPosition, destinationPosition) : 0);

		let closestCity = null;
		let destinationCity = destination ? getCityLabelFromAddressText(destination.address) : null;
		const destinationCityName = destinationCity ? String(destinationCity).trim() : null;
		const excludedNames = new Set(destinationCityName ? [destinationCityName] : []);
		const closestCityEntries = [];
		const aheadCityEntries = [];
		let lookupMode = routeLoaded ? "route-corridor-reverse-geocode" : "current-position-reverse-geocode";
		const localCurrentCity = findNearestLocalCity(currentPosition, excludedNames);
		const localRouteCityEntries = routeLoaded && routeCheckpoints && routeCheckpoints.length
			? buildLocalRouteCityEntries(routeCheckpoints, excludedNames)
			: [];

		if (localCurrentCity) {
			closestCityEntries.push(buildEtaEstimate(localCurrentCity.name, localCurrentCity.distanceKm, snapshotTimestampMs, speedModel));
			lookupMode = "local-city-catalog";
		}

		localRouteCityEntries.forEach(function (entry) {
			if (entry.distanceKm <= 60) {
				closestCityEntries.push(entry);
			}

			if (entry.distanceKm >= 15) {
				aheadCityEntries.push(entry);
			}
		});

		const hasLocalCityMatches = closestCityEntries.length > 0 || aheadCityEntries.length > 0;

		if (!hasLocalCityMatches) {
			try {
				closestCity = await reverseGeocodeCity(currentPosition);
			} catch (error) {
				closestCity = null;
				if (error && error.code) {
					lookupMode = error.code;
				}
			}

			if (closestCity) {
				closestCityEntries.push(buildEtaEstimate(closestCity, 0, snapshotTimestampMs, speedModel));
			}

			if (routeLoaded && routeCheckpoints && routeCheckpoints.length) {
				for (const checkpoint of routeCheckpoints) {
					try {
						const checkpointCity = checkpoint.isDestination
							? destinationCity
							: await reverseGeocodeCity(checkpoint.position);
						const entry = buildSnapshotCheckpointEta(checkpoint, checkpointCity);

						if (!entry) {
							continue;
						}

						if (destinationCityName && entry.name === destinationCityName) {
							continue;
						}

						if (entry.distanceKm <= 60) {
							closestCityEntries.push(entry);
						}

						if (entry.distanceKm >= 15) {
							aheadCityEntries.push(entry);
						}
					} catch (error) {
						if (error && error.code && (lookupMode === "route-corridor-reverse-geocode" || lookupMode === "current-position-reverse-geocode")) {
							lookupMode = error.code;
						}
						continue;
					}
				}
			} else if (routeLoaded && remainingDistanceKm > 12) {
				const bearing = bearingDegrees(currentPosition, destinationPosition);
				const probeDistances = getAheadProbeDistances(remainingDistanceKm);
				for (const probeDistanceKm of probeDistances) {
					try {
						const probeCity = await reverseGeocodeCity(projectCoordinate(currentPosition, bearing, probeDistanceKm));
						const entry = probeCity ? buildEtaEstimate(probeCity, probeDistanceKm, snapshotTimestampMs, speedModel) : null;
						if (!entry) {
							continue;
						}

						if (destinationCityName && entry.name === destinationCityName) {
							continue;
						}

						if (entry.distanceKm <= 60) {
							closestCityEntries.push(entry);
						}

						if (entry.distanceKm >= 15) {
							aheadCityEntries.push(entry);
						}
					} catch (error) {
						if (error && error.code && (lookupMode === "route-corridor-reverse-geocode" || lookupMode === "current-position-reverse-geocode")) {
							lookupMode = error.code;
						}
						continue;
					}
				}
			}
		}

		const orderedRouteCityEntries = uniqueCityEntries(closestCityEntries.concat(aheadCityEntries))
			.sort(function (left, right) {
				return left.distanceKm - right.distanceKm;
			});

		const uniqueClosestCityEntries = orderedRouteCityEntries
			.filter(function (entry) {
				return !destinationCityName || entry.name !== destinationCityName;
			})
			.slice(0, 4);
		const closestCities = uniqueClosestCityEntries.map(function (entry) {
			return entry.name;
		});

		const uniqueAheadCityEntries = orderedRouteCityEntries
			.filter(function (entry) {
				return entry.distanceKm >= 15 && closestCities.indexOf(entry.name) === -1 && (!destinationCityName || entry.name !== destinationCityName);
			})
			.slice(0, 8);
		const aheadCities = uniqueAheadCityEntries.map(function (entry) {
			return entry.name;
		});

		return {
			closestCities: closestCities,
			aheadCities: aheadCities,
			closestCityEtas: uniqueClosestCityEntries,
			aheadCityEtas: uniqueAheadCityEntries,
			lookupMode: lookupMode,
			remainingDistanceKm: remainingDistanceKm,
			etaModel: {
				speedKmh: routeContext && routeContext.remainingDurationMinutes > 0
					? Number((remainingDistanceKm / (routeContext.remainingDurationMinutes / 60)).toFixed(1))
					: Number(speedModel.speedKmh.toFixed(1)),
				source: routeContext ? routeContext.etaModel : speedModel.source
			}
		};
	}

	async function getCityContext(snapshot) {
		const cacheKey = buildCityLookupCacheKey(snapshot);
		const cachedValue = state.cityLookupCache.get(cacheKey);
		if (cachedValue) {
			return cachedValue;
		}

		const pendingLookup = buildCityContext(snapshot).catch(function () {
			return {
				closestCities: [],
				aheadCities: [],
				closestCityEtas: [],
				aheadCityEtas: [],
				lookupMode: "lookup-failed"
			};
		});
		state.cityLookupCache.set(cacheKey, pendingLookup);
		const resolvedValue = await pendingLookup;
		state.cityLookupCache.set(cacheKey, resolvedValue);
		return resolvedValue;
	}

	function renderSummary(summary) {
		ui.summaryGrid.innerHTML = [
			{
				label: "Messages received",
				value: String(summary.messageCount)
			},
			{
				label: "Processed samples",
				value: String(summary.processedSampleCount)
			},
			{
				label: "Analysis interval",
				value: summary.analysisIntervalLabel
			},
			{
				label: "Transport",
				value: summary.transportMode
			},
			{
				label: "Last simulator timestamp",
				value: formatIsoOrFallback(summary.lastSimulatorTimestamp)
			},
			{
				label: "Last received at",
				value: formatIsoOrFallback(summary.lastReceivedAt)
			},
			{
				label: "Current speed",
				value: summary.currentSpeedKmh === null ? "Waiting" : summary.currentSpeedKmh.toFixed(1) + " km/h"
			},
			{
				label: "Route loaded",
				value: summary.routeLoaded ? "Yes" : "No"
			},
			{
				label: "Closest cities",
				value: summary.closestCityEntries && summary.closestCityEntries.length
					? buildCitySummaryMarkup(summary.closestCityEntries)
					: getLookupModeMessage(summary.lookupMode, summary.routeLoaded),
				textCard: true
			},
			{
				label: "Cities ahead",
				value: summary.aheadCityEntries && summary.aheadCityEntries.length
					? buildCitySummaryMarkup(summary.aheadCityEntries)
					: getLookupModeMessage(summary.lookupMode, summary.routeLoaded),
				textCard: true
			},
			{
				label: "Processing status",
				value: summary.processingStatus
			},
			{
				label: "Session started",
				value: formatIsoOrFallback(summary.sessionStartedAt)
			}
		].map(function (card) {
			const loading = isLoadingStateValue(card.value);
			return '<article class="summary-card' + (card.textCard ? ' summary-card-text' : '') + (loading ? ' summary-card-loading' : '') + '"><p class="summary-label">' + card.label + '</p>' + (loading
				? '<div class="summary-loading"><strong>' + card.value + '</strong><span class="summary-loading-track" aria-hidden="true"><span class="summary-loading-bar"></span></span></div>'
				: '<strong>' + card.value + '</strong>') + '</article>';
		}).join("");
	}

	function renderLogs(logs) {
		if (!ui.logCount || !ui.logOutput) {
			return;
		}

		ui.logCount.textContent = logs.length + " entr" + (logs.length === 1 ? "y" : "ies");

		if (!logs.length) {
			ui.logOutput.className = "log-output empty-state";
			ui.logOutput.textContent = "Waiting for the simulator to publish live snapshots.";
			return;
		}

		ui.logOutput.className = "log-output";
		ui.logOutput.innerHTML = logs.map(function (entry) {
			return [
				'<article class="log-entry ' + entry.level + '">',
				'<span class="log-level">' + entry.level + '</span>',
				'<span class="log-code">' + entry.code + '</span>',
				'<div class="log-message">' + entry.message + '</div>',
				'</article>'
			].join("");
		}).join("");
	}

	function buildTextLog(result) {
		const lines = [];
		lines.push("Navigation JSON Processor");
		lines.push("Processed at: " + result.processedAt);
		lines.push("Mode: realtime-skeleton");
		lines.push("Messages received: " + result.stream.messageCount);
		lines.push("Processed samples: " + result.stream.processedSampleCount);
		lines.push("Analysis interval: " + result.stream.analysisIntervalLabel);
		lines.push("Transport: " + result.stream.transportMode);
		lines.push("Last simulator timestamp: " + formatIsoOrFallback(result.stream.lastSimulatorTimestamp));
		lines.push("ETA model: " + (result.geography.etaModel ? result.geography.etaModel.speedKmh.toFixed(1) + " km/h (" + result.geography.etaModel.source + ")" : "unavailable"));
		lines.push("Closest cities: " + (result.geography.closestCityEtas && result.geography.closestCityEtas.length ? result.geography.closestCityEtas.map(formatCityEstimateLabel).join(", ") : "None yet"));
		lines.push("Cities ahead: " + (result.geography.aheadCityEtas && result.geography.aheadCityEtas.length ? result.geography.aheadCityEtas.map(formatCityEstimateLabel).join(", ") : "None yet"));
		lines.push("");
		lines.push("Logs:");

		result.logs.forEach(function (entry, index) {
			lines.push((index + 1) + ". [" + entry.level.toUpperCase() + "] " + entry.code + " - " + entry.message);
		});

		return lines.join("\n");
	}

	function getEnvelopeSignature(envelope) {
		const publishedAt = envelope && envelope.publishedAt ? envelope.publishedAt : "no-published-at";
		const timestamp = envelope && envelope.snapshot && envelope.snapshot.timestamp ? envelope.snapshot.timestamp : "no-timestamp";
		return publishedAt + "::" + timestamp;
	}

	function rememberLog(level, code, message, context) {
		pushLog(state.logs, level, code, message, context);
		state.logs = state.logs.slice(-40);
	}

	async function buildProcessingSkeleton(snapshot) {
		const userPosition = snapshot && snapshot.user ? snapshot.user.position : null;
		const speedKmh = snapshot && snapshot.user && typeof snapshot.user.speedKmh === "number"
			? snapshot.user.speedKmh
			: null;
		const cityContext = await getCityContext(snapshot);

		return {
			processedAt: new Date().toISOString(),
			mode: "realtime-skeleton",
			stream: {
				transportMode: state.transportMode,
				messageCount: state.messageCount,
				processedSampleCount: state.processedSampleCount,
				analysisIntervalMs: state.analysisIntervalMs,
				analysisIntervalLabel: formatIntervalLabel(state.analysisIntervalMs),
				sessionStartedAt: state.sessionStartedAt,
				lastReceivedAt: state.lastEnvelope ? state.lastEnvelope.publishedAt : null,
				lastSimulatorTimestamp: snapshot ? snapshot.timestamp || null : null
			},
			processing: {
				status: cityContext.lookupMode === "lookup-failed" ? "partial-city-context" : "city-context-ready",
				notes: [
					"Real-time transport is active.",
					"Closest and ahead city context is being inferred from the live route corridor.",
					"Replace or refine this logic once you define the final processor rules."
				]
			},
			geography: cityContext,
			snapshot: snapshot,
			session: {
				lastKnownPosition: userPosition || null,
				lastKnownSpeedKmh: speedKmh,
				logEntryCount: state.logs.length
			},
			logs: state.logs
		};
	}

	function renderResult(result) {
		const processedOutputPayload = buildProcessedOutputPayload(result);
		state.lastResult = result;
		renderSummary({
			messageCount: result.stream.messageCount,
			processedSampleCount: result.stream.processedSampleCount,
			analysisIntervalLabel: result.stream.analysisIntervalLabel,
			transportMode: result.stream.transportMode,
			lastSimulatorTimestamp: result.stream.lastSimulatorTimestamp,
			lastReceivedAt: result.stream.lastReceivedAt,
			currentSpeedKmh: result.session.lastKnownSpeedKmh,
			closestCityEntries: result.geography.closestCityEtas || [],
			aheadCityEntries: result.geography.aheadCityEtas || [],
			closestCityLabels: (result.geography.closestCityEtas || []).map(formatCityEstimateLabel).filter(Boolean),
			aheadCityLabels: (result.geography.aheadCityEtas || []).map(formatCityEstimateLabel).filter(Boolean),
			lookupMode: result.geography.lookupMode,
			routeLoaded: Boolean(result.snapshot && result.snapshot.simulation && result.snapshot.simulation.routeLoaded),
			processingStatus: result.processing.status,
			sessionStartedAt: result.stream.sessionStartedAt
		});
		renderLogs(result.logs);
		ui.processedJson.textContent = processedOutputPayload.processedOutputText;
		publishProcessedOutputPayload(processedOutputPayload);
		updateIncomingTransportReadouts(result.snapshot, result.stream.lastReceivedAt);
		updateIncomingSnapshotPreview(result.snapshot);
		if (ui.downloadJsonBtn) {
			ui.downloadJsonBtn.disabled = false;
		}
		if (ui.downloadLogBtn) {
			ui.downloadLogBtn.disabled = false;
		}
		setStatus(ui.resultStatus, "Live skeleton ready", "");
	}

	async function acceptEnvelope(envelope, transportMode) {
		try {
			if (!envelope || typeof envelope !== "object" || !envelope.snapshot || typeof envelope.snapshot !== "object") {
				rememberLog("warn", "INVALID_ENVELOPE", "Received a live message without a valid snapshot payload.");
				renderLogs(state.logs);
				setStatus(ui.inputStatus, "Ignoring invalid live message", "warn");
				return;
			}

			const nextSignature = getEnvelopeSignature(envelope);
			if (nextSignature === state.lastAcceptedSignature) {
				return;
			}

			state.transportMode = transportMode;
			state.lastEnvelope = envelope;
			state.lastAcceptedSignature = nextSignature;
			state.messageCount += 1;
			updateIncomingTransportReadouts(envelope.snapshot, envelope.publishedAt || null);

			const snapshotTimestampMs = envelope.snapshot && envelope.snapshot.timestamp
				? Date.parse(envelope.snapshot.timestamp)
				: NaN;
			updateAnalysisProgress(snapshotTimestampMs);
			if (!shouldProcessSnapshot(snapshotTimestampMs)) {
				setStatus(ui.inputStatus, "Live stream active", "");
				return;
			}

			if (state.isProcessingSample) {
				setStatus(ui.inputStatus, "Live stream active", "");
				return;
			}

			state.isProcessingSample = true;
			state.processingRequestId += 1;
			const requestId = state.processingRequestId;
			state.lastProcessedSimulatorTimestampMs = Number.isFinite(snapshotTimestampMs) ? snapshotTimestampMs : null;
			updateAnalysisProgress(snapshotTimestampMs);
			state.processedSampleCount += 1;
			rememberLog("info", "SNAPSHOT_RECEIVED", "Received live snapshot #" + state.messageCount + " via " + transportMode + ".", {
				publishedAt: envelope.publishedAt || null,
				timestamp: envelope.snapshot.timestamp || null
			});
			const result = await buildProcessingSkeleton(envelope.snapshot);
			if (requestId !== state.processingRequestId) {
				return;
			}

			const citySignature = (result.geography.closestCityEtas || []).map(formatCityEstimateLabel).join("|") + "::" + (result.geography.aheadCityEtas || []).map(formatCityEstimateLabel).join("|");
			if (citySignature !== state.lastCityContextSignature) {
				state.lastCityContextSignature = citySignature;
				rememberLog(
					"info",
					"CITY_CONTEXT",
					"Closest cities: " + ((result.geography.closestCityEtas || []).length ? result.geography.closestCityEtas.map(formatCityEstimateLabel).join(", ") : "none")
						+ " | Ahead: " + ((result.geography.aheadCityEtas || []).length ? result.geography.aheadCityEtas.map(formatCityEstimateLabel).join(", ") : "none") + "."
				);
				result.logs = state.logs;
			}
			renderResult(result);
			setStatus(ui.inputStatus, "Live stream active", "");
		} catch (error) {
			rememberLog("error", "STREAM_ERROR", error.message);
			renderLogs(state.logs);
			setStatus(ui.inputStatus, "Live stream error", "danger");
			setStatus(ui.resultStatus, "Skeleton stalled", "danger");
		} finally {
			state.isProcessingSample = false;
		}
	}

	function startRealtimeBridge() {
		if (state.channel) {
			state.channel.close();
			state.channel = null;
		}

		if (state.pollTimer) {
			window.clearInterval(state.pollTimer);
			state.pollTimer = null;
		}

		try {
			state.lastStorageValue = window.localStorage.getItem(LIVE_STORAGE_KEY);
		} catch (error) {
			state.lastStorageValue = null;
		}

		if (typeof BroadcastChannel === "function") {
			state.channel = new BroadcastChannel(LIVE_CHANNEL_NAME);
			state.channel.addEventListener("message", function (event) {
				acceptEnvelope(event.data, "broadcast-channel");
			});
			state.transportMode = "broadcast-channel + storage-fallback";
		} else {
			state.transportMode = "storage-fallback";
		}

		state.pollTimer = window.setInterval(function () {
			try {
				const nextValue = window.localStorage.getItem(LIVE_STORAGE_KEY);
				if (!nextValue || nextValue === state.lastStorageValue) {
					return;
				}

				state.lastStorageValue = nextValue;
				acceptEnvelope(JSON.parse(nextValue), "local-storage");
			} catch (error) {
				rememberLog("warn", "STORAGE_READ_FAILED", "Failed to read the local live snapshot fallback.");
				renderLogs(state.logs);
			}
		}, 750);

		setStatus(ui.inputStatus, "Listening for simulator", "");
		rememberLog("info", "STREAM_READY", "Real-time stream bridge initialized.");
		renderLogs(state.logs);
	}

	function resetSession() {
		state.lastResult = null;
		state.messageCount = 0;
		state.logs = [];
		state.sessionStartedAt = new Date().toISOString();
		state.lastEnvelope = null;
		state.lastAcceptedSignature = null;
		state.lastCityContextSignature = null;
		state.lastProcessedSimulatorTimestampMs = null;
		state.latestSimulatorTimestampMs = null;
		state.processedSampleCount = 0;
		try {
			state.lastStorageValue = window.localStorage.getItem(LIVE_STORAGE_KEY);
		} catch (error) {
			state.lastStorageValue = null;
		}
		renderSummary({
			messageCount: 0,
			processedSampleCount: 0,
			analysisIntervalLabel: formatIntervalLabel(state.analysisIntervalMs),
			transportMode: state.transportMode,
			lastSimulatorTimestamp: null,
			lastReceivedAt: null,
			currentSpeedKmh: null,
			closestCityEntries: [],
			aheadCityEntries: [],
			lookupMode: "no-position",
			closestCities: [],
			aheadCities: [],
			routeLoaded: false,
			processingStatus: "pending-definition",
			sessionStartedAt: state.sessionStartedAt
		});
		renderLogs([]);
		updateIncomingTransportReadouts(null, null);
		ui.rawJson.textContent = JSON.stringify({
			status: "waiting-for-live-snapshot"
		}, null, 2);
		ui.processedJson.textContent = [
			"Cities and their ETAs",
			"",
			"Waiting for route city data."
		].join("\n");
		publishProcessedOutputPayload({
			source: "navigation-route-city-finder",
			publishedAt: new Date().toISOString(),
			currentTimeUtc: null,
			processedOutputText: ui.processedJson.textContent,
			cityEntries: [],
			status: "waiting-for-route-city-data"
		});
		ui.messageCountReadout.textContent = "0";
		ui.lastSimulatorTimeReadout.textContent = "Waiting";
		ui.lastReceivedReadout.textContent = "Waiting";
		if (ui.analysisFrequency) {
			ui.analysisFrequency.value = String(state.analysisIntervalMs);
		}
		updateAnalysisProgress(null);
		if (ui.downloadJsonBtn) {
			ui.downloadJsonBtn.disabled = true;
		}
		if (ui.downloadLogBtn) {
			ui.downloadLogBtn.disabled = true;
		}
		setStatus(ui.resultStatus, "No result yet", "muted");
		setStatus(ui.inputStatus, "Listening for simulator", "");
	}

	function bindEvents() {
		window.addEventListener("storage", function (event) {
			if (event.key !== LIVE_STORAGE_KEY || !event.newValue || event.newValue === state.lastStorageValue) {
				return;
			}

			state.lastStorageValue = event.newValue;
			acceptEnvelope(JSON.parse(event.newValue), "storage-event");
		});

		ui.reconnectBtn.addEventListener("click", function () {
			startRealtimeBridge();
			setStatus(ui.inputStatus, "Reconnected to simulator", "");
		});

		ui.resetSessionBtn.addEventListener("click", function () {
			resetSession();
			rememberLog("info", "SESSION_RESET", "Processor session state cleared.");
			renderLogs(state.logs);
		});

		ui.analysisFrequency.addEventListener("change", function (event) {
			state.analysisIntervalMs = Number(event.target.value) || DEFAULT_ANALYSIS_INTERVAL_MS;
			state.lastProcessedSimulatorTimestampMs = null;
			updateAnalysisProgress(null);
			rememberLog("info", "ANALYSIS_INTERVAL", "Processor sampling changed to one sample every " + formatIntervalLabel(state.analysisIntervalMs) + ".");
			renderLogs(state.logs);
			if (state.lastResult) {
				renderSummary({
					messageCount: state.messageCount,
					processedSampleCount: state.processedSampleCount,
					analysisIntervalLabel: formatIntervalLabel(state.analysisIntervalMs),
					transportMode: state.transportMode,
					lastSimulatorTimestamp: state.lastEnvelope && state.lastEnvelope.snapshot ? state.lastEnvelope.snapshot.timestamp || null : null,
					lastReceivedAt: state.lastEnvelope ? state.lastEnvelope.publishedAt || null : null,
					currentSpeedKmh: state.lastResult.session.lastKnownSpeedKmh,
					closestCityEntries: state.lastResult.geography.closestCityEtas || [],
					aheadCityEntries: state.lastResult.geography.aheadCityEtas || [],
					lookupMode: state.lastResult.geography.lookupMode,
					closestCities: state.lastResult.geography.closestCities,
					aheadCities: state.lastResult.geography.aheadCities,
					routeLoaded: Boolean(state.lastResult.snapshot && state.lastResult.snapshot.simulation && state.lastResult.snapshot.simulation.routeLoaded),
					processingStatus: state.lastResult.processing.status,
					sessionStartedAt: state.sessionStartedAt
				});
			}
		});

		if (ui.copyProcessedJsonBtn) {
			ui.copyProcessedJsonBtn.addEventListener("click", async function () {
				const originalLabel = "Copy output";
				try {
					await copyTextToClipboard(ui.processedJson.textContent);
					setCopyButtonLabel("Copied");
					window.setTimeout(function () {
						setCopyButtonLabel(originalLabel);
					}, 1400);
				} catch (error) {
					setCopyButtonLabel("Copy failed");
					window.setTimeout(function () {
						setCopyButtonLabel(originalLabel);
					}, 1800);
				}
			});
		}

		if (ui.downloadJsonBtn) {
			ui.downloadJsonBtn.addEventListener("click", function () {
				if (!state.lastResult) {
					return;
				}

				downloadText("processing-output.json", JSON.stringify(state.lastResult, null, 2), "application/json");
			});
		}

		if (ui.downloadLogBtn) {
			ui.downloadLogBtn.addEventListener("click", function () {
				if (!state.lastResult) {
					return;
				}

				downloadText("processing-log.txt", buildTextLog(state.lastResult), "text/plain;charset=utf-8");
			});
		}
	}

	function initialize() {
		renderSummary({
			messageCount: 0,
			processedSampleCount: 0,
			analysisIntervalLabel: formatIntervalLabel(state.analysisIntervalMs),
			transportMode: "starting",
			lastSimulatorTimestamp: null,
			lastReceivedAt: null,
			currentSpeedKmh: null,
			closestCityEntries: [],
			aheadCityEntries: [],
			lookupMode: "no-position",
			closestCities: [],
			aheadCities: [],
			routeLoaded: false,
			processingStatus: "pending-definition",
			sessionStartedAt: state.sessionStartedAt
		});
		renderLogs([]);
		ui.rawJson.textContent = JSON.stringify({
			status: "waiting-for-live-snapshot"
		}, null, 2);
		ui.processedJson.textContent = [
			"Cities and their ETAs",
			"",
			"Waiting for route city data."
		].join("\n");
		publishProcessedOutputPayload({
			source: "navigation-route-city-finder",
			publishedAt: new Date().toISOString(),
			currentTimeUtc: null,
			processedOutputText: ui.processedJson.textContent,
			cityEntries: [],
			status: "waiting-for-route-city-data"
		});
		setReadoutValue(ui.transportReadout, "Starting…");
		setReadoutValue(ui.messageCountReadout, "0");
		setReadoutValue(ui.lastSimulatorTimeReadout, "Waiting");
		setReadoutValue(ui.lastReceivedReadout, "Waiting");
		if (ui.analysisFrequency) {
			ui.analysisFrequency.value = String(state.analysisIntervalMs);
		}
		updateAnalysisProgress(null);
		setStatus(ui.inputStatus, "Connecting", "");
		setStatus(ui.resultStatus, "No result yet", "muted");
		bindEvents();
		startRealtimeBridge();
	}

	initialize();
})();