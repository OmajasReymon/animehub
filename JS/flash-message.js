(function () {
    const STORAGE_KEY = "animehub_flash_message";
    const ICONS = {
        success: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.6 16.2 5.4 12l-1.4 1.4 5.6 5.6L20 8.6l-1.4-1.4z" fill="currentColor"></path></svg>',
        error: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 1 21h22L12 2zm1 15h-2v-2h2v2zm0-4h-2V9h2v4z" fill="currentColor"></path></svg>',
        warning: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor"></path></svg>',
        info: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 10h2v7h-2zm0-3h2v2h-2z" fill="currentColor"></path><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z" fill="currentColor"></path></svg>'
    };
    let stack = null;

    function ensureStack() {
        if (stack) {
            return stack;
        }

        stack = document.getElementById("flashStack");

        if (stack) {
            return stack;
        }

        stack = document.createElement("div");
        stack.id = "flashStack";
        stack.className = "flash-stack";
        document.body.appendChild(stack);
        return stack;
    }

    function normalizeOptions(input, typeOrOptions, maybeOptions) {
        if (typeof input === "object" && input !== null) {
            return {
                title: input.title || "AnimeHub",
                message: input.message || "",
                type: input.type || "info",
                duration: typeof input.duration === "number" ? input.duration : 3200
            };
        }

        if (typeof typeOrOptions === "object" && typeOrOptions !== null) {
            return {
                title: typeOrOptions.title || "AnimeHub",
                message: input || typeOrOptions.message || "",
                type: typeOrOptions.type || "info",
                duration: typeof typeOrOptions.duration === "number" ? typeOrOptions.duration : 3200
            };
        }

        return {
            title: maybeOptions?.title || "AnimeHub",
            message: input || "",
            type: typeOrOptions || maybeOptions?.type || "info",
            duration: typeof maybeOptions?.duration === "number" ? maybeOptions.duration : 3200
        };
    }

    function closeToast(toast) {
        if (!toast || toast.classList.contains("is-closing")) {
            return;
        }

        toast.classList.add("is-closing");
        window.setTimeout(() => {
            toast.remove();
        }, 220);
    }

    function show(message, type = "info", options = {}) {
        const normalized = normalizeOptions(message, type, options);
        const toast = document.createElement("section");
        toast.className = `flash-toast ${normalized.type}`;
        toast.setAttribute("role", normalized.type === "error" ? "alert" : "status");
        toast.innerHTML = `
            <div class="flash-icon">${ICONS[normalized.type] || ICONS.info}</div>
            <div class="flash-body">
                <p class="flash-title">${normalized.title}</p>
                <p class="flash-message">${normalized.message}</p>
            </div>
            <button class="flash-close" type="button" aria-label="Dismiss message">×</button>
        `;

        toast.querySelector(".flash-close")?.addEventListener("click", () => closeToast(toast));
        ensureStack().appendChild(toast);

        if (normalized.duration > 0) {
            window.setTimeout(() => closeToast(toast), normalized.duration);
        }

        return toast;
    }

    function queue(message, type = "info", options = {}) {
        const normalized = normalizeOptions(message, type, options);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }

    function consumeQueued() {
        let rawValue = null;

        try {
            rawValue = sessionStorage.getItem(STORAGE_KEY);
            sessionStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            return;
        }

        if (!rawValue) {
            return;
        }

        try {
            const payload = JSON.parse(rawValue);
            show(payload);
        } catch (error) {
            // Ignore malformed flash data.
        }
    }

    document.addEventListener("DOMContentLoaded", consumeQueued);

    window.AnimeHubToast = {
        show,
        queue,
        consumeQueued
    };
})();
