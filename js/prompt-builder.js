(function () {
	const PROCESSED_OUTPUT_CHANNEL_NAME = "navigation-processed-output";
	const PROCESSED_OUTPUT_STORAGE_KEY = "navigation-processed-output-payload";
	const MASTER_CATEGORY_ID = "all";
	const INTEREST_CATEGORIES = [
		{ id: MASTER_CATEGORY_ID, label: "All", emoji: "✨" },
		{ id: "party", label: "Party", emoji: "🎉" },
		{ id: "festival", label: "Festival", emoji: "🎪" },
		{ id: "street-markets", label: "Street markets", emoji: "🛍️" },
		{ id: "concerts", label: "Concerts", emoji: "🎵" },
		{ id: "art-galleries", label: "Art galleries", emoji: "🖼️" },
		{ id: "sports-events", label: "Sports events", emoji: "🏟️" },
		{ id: "traditional-celebrations", label: "Traditional celebrations", emoji: "🏮" },
		{ id: "food-fairs", label: "Food fairs", emoji: "🍲" },
		{ id: "wine-events", label: "Wine events", emoji: "🍷" },
		{ id: "craft-fairs", label: "Craft fairs", emoji: "🧵" },
		{ id: "theatre", label: "Theatre", emoji: "🎭" },
		{ id: "opera", label: "Opera", emoji: "🎼" },
		{ id: "dance", label: "Dance", emoji: "💃" },
		{ id: "dj-sets", label: "DJ sets", emoji: "🎧" },
		{ id: "live-music", label: "Live music", emoji: "🎸" },
		{ id: "film-screenings", label: "Film screenings", emoji: "🎬" },
		{ id: "book-fairs", label: "Book fairs", emoji: "📚" },
		{ id: "poetry-readings", label: "Poetry readings", emoji: "📝" },
		{ id: "comedy-shows", label: "Comedy shows", emoji: "😂" },
		{ id: "night-markets", label: "Night markets", emoji: "🌙" },
		{ id: "farmers-markets", label: "Farmers markets", emoji: "🥕" },
		{ id: "flea-markets", label: "Flea markets", emoji: "🧺" },
		{ id: "design-fairs", label: "Design fairs", emoji: "🪑" },
		{ id: "fashion-events", label: "Fashion events", emoji: "👗" },
		{ id: "heritage-open-days", label: "Heritage open days", emoji: "🏛️" },
		{ id: "museum-nights", label: "Museum nights", emoji: "🗿" },
		{ id: "religious-processions", label: "Religious processions", emoji: "⛪" },
		{ id: "food-popups", label: "Food pop-ups", emoji: "🍢" },
		{ id: "beer-festivals", label: "Beer festivals", emoji: "🍺" },
		{ id: "cheese-fairs", label: "Cheese fairs", emoji: "🧀" },
		{ id: "folk-music", label: "Folk music", emoji: "🪗" },
		{ id: "classical-music", label: "Classical music", emoji: "🎻" },
		{ id: "jazz", label: "Jazz", emoji: "🎷" },
		{ id: "rock", label: "Rock", emoji: "🤘" },
		{ id: "electronic-music", label: "Electronic music", emoji: "🪩" },
		{ id: "running-races", label: "Running races", emoji: "🏃" },
		{ id: "cycling-events", label: "Cycling events", emoji: "🚴" },
		{ id: "football-matches", label: "Football matches", emoji: "⚽" },
		{ id: "basketball-games", label: "Basketball games", emoji: "🏀" },
		{ id: "waterfront-events", label: "Waterfront events", emoji: "🌊" },
		{ id: "fireworks", label: "Fireworks", emoji: "🎆" },
		{ id: "light-shows", label: "Light shows", emoji: "💡" },
		{ id: "flower-festivals", label: "Flower festivals", emoji: "🌸" },
		{ id: "vintage-car-rallies", label: "Vintage car rallies", emoji: "🚗" },
		{ id: "artisan-workshops", label: "Artisan workshops", emoji: "🛠️" },
		{ id: "food-truck-events", label: "Food truck events", emoji: "🚚" },
		{ id: "sailing-events", label: "Sailing events", emoji: "⛵" },
		{ id: "wellness-festivals", label: "Wellness festivals", emoji: "🧘" },
		{ id: "family-events", label: "Family events", emoji: "👨‍👩‍👧‍👦" },
		{ id: "technology-expos", label: "Technology expos", emoji: "🧠" }
	];

	const ui = {
		interestGrid: document.getElementById("interest-grid"),
		feedCard: document.getElementById("feed-card"),
		feedStatus: document.getElementById("feed-status"),
		feedTime: document.getElementById("feed-time"),
		promptOutput: document.getElementById("prompt-output"),
		copyPromptBtn: document.getElementById("copy-prompt-btn"),
		resultDraft: document.getElementById("result-draft"),
		tabButtons: Array.prototype.slice.call(document.querySelectorAll("[data-tab-target]")),
		tabPanels: Array.prototype.slice.call(document.querySelectorAll("[data-tab-panel]"))
	};

	const state = {
		selectedCategoryIds: new Set(),
		processedPayload: null,
		activeTab: "categories",
		channel: null,
		pollTimer: null,
		lastStorageValue: null
	};

	function formatUtcTimestamp(value) {
		if (!value) {
			return "waiting";
		}

		const date = new Date(value);
		if (Number.isNaN(date.getTime())) {
			return String(value);
		}

		return date.toISOString().replace("T", " ").replace(".000Z", " UTC");
	}

	function getSelectedLabels() {
		const regularSelections = INTEREST_CATEGORIES
			.filter(function (category) {
				return category.id !== MASTER_CATEGORY_ID && state.selectedCategoryIds.has(category.id);
			})
			.map(function (category) {
				return category.label;
			});

		if (!regularSelections.length) {
			return "no categories selected yet";
		}

		return regularSelections.join(", ");
	}

	function getSelectedBulletLines() {
		if (state.selectedCategoryIds.has(MASTER_CATEGORY_ID)) {
			return [];
		}

		const regularSelections = INTEREST_CATEGORIES
			.filter(function (category) {
				return category.id !== MASTER_CATEGORY_ID && state.selectedCategoryIds.has(category.id);
			})
			.map(function (category) {
				return "- " + category.label;
			});

		if (!regularSelections.length) {
			return ["- No categories selected yet"];
		}

		return regularSelections;
	}

	function hasUsableProcessedOutput(payload) {
		if (!payload || typeof payload !== "object") {
			return false;
		}

		if (Array.isArray(payload.cityEntries) && payload.cityEntries.length > 0) {
			return true;
		}

		return typeof payload.processedOutputText === "string"
			&& payload.processedOutputText.indexOf("Waiting for route city data.") === -1;
	}

	function buildPromptText() {
		const payload = state.processedPayload;
		if (!hasUsableProcessedOutput(payload)) {
			return "Waiting for route city data.";
		}

		const currentTime = payload && payload.currentTimeUtc ? formatUtcTimestamp(payload.currentTimeUtc) : "waiting for current route time";
		const processedOutput = payload.processedOutputText;
		const allSelected = state.selectedCategoryIds.has(MASTER_CATEGORY_ID);
		const selectedCategoryBullets = getSelectedBulletLines();

		const promptSections = [
			"The current UTC time is " + currentTime + ". I am on the road and these are the next cities on my route with their estimated arrival times:",
			processedOutput
		];

		if (allSelected) {
			promptSections.push("Please look for the most worthwhile time-specific events of any kind in those cities.");
		} else {
			promptSections.push("Please focus on notable time-specific events in these categories:");
			promptSections.push(selectedCategoryBullets.join("\n"));
		}

		return promptSections.concat([
			"Focus on events that are happening on the same date as the ETA for each city. Events later that same day are also valid if they are interesting and realistic to attend after arrival. Do not include attractions, venues, or activities that are available continuously and could be visited at any time.",
			"Be strict with the response format: return only a list of events and their supporting links, grouped by city.",
			"If you do not find any qualifying events, do not return anything for that city.",
			"For every event you include, provide a reliable working website link that supports it. Do not add explanations, summaries, fallback suggestions, or any text outside the event list and links."
		]).join("\n\n");
	}

	function renderPrompt() {
		ui.promptOutput.textContent = buildPromptText();
		ui.copyPromptBtn.disabled = !hasUsableProcessedOutput(state.processedPayload);
	}

	function renderTabs() {
		ui.tabButtons.forEach(function (button) {
			const isActive = button.getAttribute("data-tab-target") === state.activeTab;
			button.classList.toggle("is-active", isActive);
			button.setAttribute("aria-pressed", String(isActive));
		});

		ui.tabPanels.forEach(function (panel) {
			const isActive = panel.getAttribute("data-tab-panel") === state.activeTab;
			panel.classList.toggle("is-active", isActive);
		});

		if (ui.copyPromptBtn) {
			const shouldHideCopyButton = state.activeTab !== "prompt";
			ui.copyPromptBtn.hidden = shouldHideCopyButton;
			ui.copyPromptBtn.classList.toggle("is-hidden", shouldHideCopyButton);
			ui.copyPromptBtn.setAttribute("aria-hidden", String(shouldHideCopyButton));
		}
	}

	function syncMasterCategoryState() {
		if (state.selectedCategoryIds.size > 1 && state.selectedCategoryIds.has(MASTER_CATEGORY_ID)) {
			state.selectedCategoryIds.delete(MASTER_CATEGORY_ID);
		}
	}

	function toggleCategory(categoryId) {
		if (categoryId === MASTER_CATEGORY_ID) {
			const selectingAll = !state.selectedCategoryIds.has(MASTER_CATEGORY_ID);
			state.selectedCategoryIds.clear();
			if (selectingAll) {
				state.selectedCategoryIds.add(MASTER_CATEGORY_ID);
			}
			renderInterestGrid();
			renderPrompt();
			return;
		}

		if (state.selectedCategoryIds.has(MASTER_CATEGORY_ID)) {
			state.selectedCategoryIds.delete(MASTER_CATEGORY_ID);
		}

		if (state.selectedCategoryIds.has(categoryId)) {
			state.selectedCategoryIds.delete(categoryId);
		} else {
			state.selectedCategoryIds.add(categoryId);
		}

		syncMasterCategoryState();
		renderInterestGrid();
		renderPrompt();
	}

	function renderInterestGrid() {
		ui.interestGrid.innerHTML = INTEREST_CATEGORIES.map(function (category) {
			const isSelected = state.selectedCategoryIds.has(category.id);
			return '<button class="interest-chip' + (isSelected ? ' is-selected' : '') + '" type="button" data-category-id="' + category.id + '" aria-pressed="' + String(isSelected) + '"><span class="interest-chip-emoji" aria-hidden="true">' + category.emoji + '</span><span class="interest-chip-label">' + category.label + '</span></button>';
		}).join("");

		Array.prototype.forEach.call(ui.interestGrid.querySelectorAll("[data-category-id]"), function (button) {
			button.addEventListener("click", function () {
				toggleCategory(button.getAttribute("data-category-id"));
			});
		});
	}

	function renderFeedStatus() {
		if (!state.processedPayload) {
			ui.feedStatus.textContent = "Waiting for processed output";
			ui.feedTime.textContent = "Current route time: waiting";
			return;
		}

		const status = state.processedPayload.status === "city-context-ready"
			? "Live route output ready"
			: "Live route output updated";
		ui.feedStatus.textContent = status;
		ui.feedTime.textContent = "Current route time: " + formatUtcTimestamp(state.processedPayload.currentTimeUtc);
	}

	function acceptProcessedPayload(payload) {
		if (!payload || typeof payload !== "object") {
			return;
		}

		state.processedPayload = payload;
		renderFeedStatus();
		renderPrompt();
	}

	async function copyPrompt() {
		const text = ui.promptOutput.textContent;
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

	function setActiveTab(tabName) {
		state.activeTab = tabName;
		renderTabs();
	}

	function bindEvents() {
		ui.tabButtons.forEach(function (button) {
			button.addEventListener("click", function () {
				setActiveTab(button.getAttribute("data-tab-target"));
			});
		});

		ui.copyPromptBtn.addEventListener("click", async function () {
			const originalLabel = "Copy prompt";
			try {
				await copyPrompt();
				ui.copyPromptBtn.textContent = "Copied";
				window.setTimeout(function () {
					ui.copyPromptBtn.textContent = originalLabel;
				}, 1400);
			} catch (error) {
				ui.copyPromptBtn.textContent = "Copy failed";
				window.setTimeout(function () {
					ui.copyPromptBtn.textContent = originalLabel;
				}, 1800);
			}
		});

		// Temporary workaround until the live query/API-key flow is implemented.
		if (ui.resultDraft) {
			ui.resultDraft.addEventListener("input", function () {
				return;
			});
		}
	}

	function startBridge() {
		try {
			state.lastStorageValue = window.localStorage.getItem(PROCESSED_OUTPUT_STORAGE_KEY);
			if (state.lastStorageValue) {
				acceptProcessedPayload(JSON.parse(state.lastStorageValue));
			}
		} catch (error) {
			state.lastStorageValue = null;
		}

		if (typeof BroadcastChannel === "function") {
			state.channel = new BroadcastChannel(PROCESSED_OUTPUT_CHANNEL_NAME);
			state.channel.addEventListener("message", function (event) {
				acceptProcessedPayload(event.data);
			});
		}

		state.pollTimer = window.setInterval(function () {
			try {
				const nextValue = window.localStorage.getItem(PROCESSED_OUTPUT_STORAGE_KEY);
				if (!nextValue || nextValue === state.lastStorageValue) {
					return;
				}

				state.lastStorageValue = nextValue;
				acceptProcessedPayload(JSON.parse(nextValue));
			} catch (error) {
				return;
			}
		}, 800);
	}

	function initialize() {
		renderInterestGrid();
		renderFeedStatus();
		renderPrompt();
		renderTabs();
		bindEvents();
		startBridge();
	}

	initialize();
})();
