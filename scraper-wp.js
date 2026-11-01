(function () {
    'use strict';

    var S = {
        els: {},
        state: {
            authenticated: false,
            apiKey: '',
            walletAddress: '',
            searchInProgress: false,
            results: [],
            unfilteredResults: [],
            filterType: 'all',
            filterAuthor: '',
            myData: [],
            myDataTotal: 0,
            myDataPage: 0,
            myDataLimit: 25,
            myDataGroups: [],
            myDataGroupsTotal: 0,
            myDataGroupsPage: 0,
            myDataExpandedQuery: '',
            storageOption: 'guildera_db',
            rateLimit: null,
            tier: 'free',
            limits: {},
            resultsView: 'cards',
        },
    };

    S.nonce = function () {
        return typeof GUILDERA_SCRAPER !== 'undefined' ? GUILDERA_SCRAPER.nonce : '';
    };

    S.ajaxUrl = function () {
        return typeof GUILDERA_SCRAPER !== 'undefined' ? GUILDERA_SCRAPER.ajax_url : '';
    };

    S.isTwitterCDN = function (url) {
        return typeof url === 'string' && (url.indexOf('pbs.twimg.com') !== -1 || url.indexOf('abs.twimg.com') !== -1 || url.indexOf('video.twimg.com') !== -1);
    };

    S.proxyImage = function (url) {
        if (!url || typeof url !== 'string') return url;
        if (S.isTwitterCDN(url)) {
            return S.ajaxUrl() + '?action=guildera_scraper_proxy_image&url=' + encodeURIComponent(url);
        }
        return url;
    };

    S.imgSrc = function (url) {
        if (!url || typeof url !== 'string') return '';
        return S.escAttr(url);
    };

    S.activateLazyImages = function () {
        document.querySelectorAll('img[data-src]').forEach(function (img) {
            img.src = img.getAttribute('data-src');
            img.removeAttribute('data-src');
        });
    };

    S.init = function () {
        S.els.authOverlay = document.getElementById('scraper-auth-overlay');
        S.els.authCard = document.getElementById('scraper-auth-card');
        S.els.authKeyInput = document.getElementById('scraper-auth-key');
        S.els.authSubmit = document.getElementById('scraper-auth-submit');
        S.els.authError = document.getElementById('scraper-auth-error');
        S.els.authCaptcha = document.getElementById('scraper-auth-captcha');
        S.els.dashboard = document.getElementById('scraper-dashboard');
        S.els.authStatus = document.getElementById('scraper-auth-status');
        S.els.statusKey = document.getElementById('scraper-status-key');
        S.els.logoutBtn = document.getElementById('scraper-logout-btn');
        S.els.switchWalletBtn = document.getElementById('scraper-switch-wallet-btn');
        S.els.navBtns = document.querySelectorAll('.scraper-nav-btn');
        S.els.panels = document.querySelectorAll('.scraper-panel');
        S.els.sourceType = document.getElementById('scraper-source-type');
        S.els.target = document.getElementById('scraper-target');
        S.els.targetHint = document.getElementById('scraper-target-hint');
        S.els.maxResults = document.getElementById('scraper-max-results');
        S.els.startDate = document.getElementById('scraper-start-date');
        S.els.endDate = document.getElementById('scraper-end-date');
        S.els.mediaOnly = document.getElementById('scraper-media-only');
        S.els.searchBtn = document.getElementById('scraper-search-btn');
        S.els.testBtn = document.getElementById('scraper-test-btn');
        S.els.resultsBody = document.getElementById('scraper-results-body');
        S.els.resultsCount = document.getElementById('scraper-results-count');
        S.els.historyList = document.getElementById('scraper-history-list');
        S.els.toast = document.getElementById('scraper-toast');
        S.els.toastMsg = document.getElementById('scraper-toast-msg');
        S.els.saveSection = document.getElementById('scraper-save-section');
        S.els.saveOptions = document.querySelectorAll('#scraper-save-options .scraper-storage-option');
        S.els.ownDbFields = document.getElementById('scraper-own-db-fields');
        S.els.saveBtn = document.getElementById('scraper-save-btn');
        S.els.saveStatus = document.getElementById('scraper-save-status');
        S.els.ownSupabaseUrl = document.getElementById('scraper-own-supabase-url');
        S.els.ownSupabaseKey = document.getElementById('scraper-own-supabase-key');
        S.els.myDataBody = document.getElementById('scraper-my-data-body');
        S.els.myDataFilter = document.getElementById('scraper-my-data-filter');
        S.els.myDataRefresh = document.getElementById('scraper-my-data-refresh');
        S.els.myDataCount = document.getElementById('scraper-my-data-count');
        S.els.myDataSelectAll = document.getElementById('scraper-my-data-select-all');
        S.els.myDataExport = document.getElementById('scraper-my-data-export');
        S.els.myDataDelete = document.getElementById('scraper-my-data-delete');
        S.els.myDataPagination = document.getElementById('scraper-my-data-pagination');
        S.els.myDataGroupsBody = document.getElementById('scraper-my-data-groups-body');
        S.els.myDataGroupsPagination = document.getElementById('scraper-my-data-groups-pagination');
        S.els.myDataGroupsView = document.getElementById('scraper-my-data-groups-view');
        S.els.myDataExpandedView = document.getElementById('scraper-my-data-expanded-view');
        S.els.myDataBackBtn = document.getElementById('scraper-my-data-back-btn');
        S.els.myDataExpandedTitle = document.getElementById('scraper-my-data-expanded-title');
        S.els.myDataExpandedCount = document.getElementById('scraper-my-data-expanded-count');
        S.els.sortOrder = document.getElementById('scraper-sort-select');
        S.els.sortBySearch = document.getElementById('scraper-sort-by');
        S.els.advSortBySearch = document.getElementById('adv-sort-by');
        S.els.filterReplies = document.getElementById('scraper-filter-replies');
        S.els.progressFill = document.getElementById('scraper-loading-fill');
        S.els.progressPct = document.getElementById('scraper-loading-pct');
        S.els.resultsFilters = document.getElementById('scraper-results-filters');
        S.els.filterAuthor = document.getElementById('scraper-filter-author');
        S.els.filterCount = document.getElementById('scraper-filter-count');
        S.els.filterBtns = document.querySelectorAll('.scraper-filter-btn');
        S.els.loadingOverlay = document.getElementById('scraper-loading-overlay');
        S.els.loadingFill = document.getElementById('scraper-loading-fill');
        S.els.loadingPct = document.getElementById('scraper-loading-pct');
        S.els.loadingStatus = document.getElementById('scraper-loading-status');
        S.els.loadingSubstatus = document.getElementById('scraper-loading-substatus');
        S.els.cancelBtn = document.getElementById('scraper-cancel-btn');
        S.els.inlineProgress = document.getElementById('scraper-inline-progress');
        S.els.inlineFill = document.getElementById('scraper-inline-fill');
        S.els.inlineText = document.getElementById('scraper-inline-text');
        S.els.inlinePct = document.getElementById('scraper-inline-pct');
        S.els.viewToggle = document.getElementById('scraper-view-toggle');
        S.els.resultsCards = document.getElementById('scraper-results-cards');
        S.els.exportCsvBtn = document.getElementById('scraper-export-csv');
        S.els.exportJsonBtn = document.getElementById('scraper-export-json');
        S.els.refreshBtn = document.getElementById('scraper-refresh-results');
        S.els.sortResultsSelect = document.getElementById('scraper-sort-results-select');
        S.els.keywordFilter = document.getElementById('scraper-keyword-filter');
        S.els.verifiedOnly = document.getElementById('scraper-verified-only');
        S.els.mediaFilter = document.getElementById('scraper-media-filter');
        S.els.selectAll = document.getElementById('scraper-select-all');
        S.els.resultsSelectAll = document.getElementById('scraper-results-select-all');
        S.els.continuousToggle = document.getElementById('scraper-continuous-toggle');
        S.els.continuousStatus = document.getElementById('scraper-continuous-status');
        S.els.clearHistoryBtn = document.getElementById('scraper-clear-history-btn');
        S.els.presetsCount = document.getElementById('scraper-presets-count');
        S.els.queryRefresh = document.getElementById('scraper-query-refresh');

        S.bindEvents();
        S.checkSession();
        S.initCustomSelects();
        S.initCollapsible();
        S.initAdvancedSearch();
        S.initPresets();

        document.addEventListener('click', function (e) {
            var target = e.target.closest('[data-lightbox-url]');
            if (target) {
                e.preventDefault();
                S.openLightbox(target.getAttribute('data-lightbox-url'));
            }
        });
    };

    S.bindEvents = function () {
        if (S.els.authSubmit) S.els.authSubmit.addEventListener('click', S.handleAuth);
        if (S.els.authKeyInput) {
            S.els.authKeyInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') S.handleAuth(e);
            });
        }
        if (S.els.logoutBtn) S.els.logoutBtn.addEventListener('click', S.handleLogout);
        if (S.els.switchWalletBtn) S.els.switchWalletBtn.addEventListener('click', S.handleSwitchWallet);

        if (S.els.navBtns) {
            S.els.navBtns.forEach(function (btn) {
                btn.addEventListener('click', S.handleTabSwitch);
            });
        }
        if (S.els.sourceType) S.els.sourceType.addEventListener('change', S.handleSourceTypeChange);
        if (S.els.searchBtn) S.els.searchBtn.addEventListener('click', S.handleSearch);
        if (S.els.testBtn) S.els.testBtn.addEventListener('click', S.testConnection);
        if (S.els.target) {
            S.els.target.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') S.handleSearch(e);
            });
        }

        S.els.saveOptions.forEach(function (opt) {
            opt.addEventListener('click', S.handleSaveOptionChange);
        });
        if (S.els.saveBtn) S.els.saveBtn.addEventListener('click', S.handleSave);

        if (S.els.myDataRefresh) S.els.myDataRefresh.addEventListener('click', function () { S.loadMyData(0); });
        if (S.els.myDataFilter) {
            S.els.myDataFilter.addEventListener('input', S.debounce(function () { S.loadMyData(0); }, 300));
        }
        if (S.els.myDataBackBtn) S.els.myDataBackBtn.addEventListener('click', function () { S.loadMyData(S.state.myDataGroupsPage); });
        if (S.els.myDataSelectAll) S.els.myDataSelectAll.addEventListener('change', S.handleMyDataSelectAll);
        if (S.els.myDataExport) S.els.myDataExport.addEventListener('click', S.handleMyDataExport);
        if (S.els.myDataDelete) S.els.myDataDelete.addEventListener('click', S.handleMyDataDelete);

        if (S.els.continuousToggle) S.els.continuousToggle.addEventListener('change', S.handleContinuousToggle);
        if (S.els.clearHistoryBtn) S.els.clearHistoryBtn.addEventListener('click', S.handleClearHistory);
        if (S.els.queryRefresh) S.els.queryRefresh.addEventListener('click', S.handleQueryReset);

        var queryModes = document.querySelectorAll('.scraper-query-mode');
        if (queryModes.length) {
            queryModes.forEach(function (btn) {
                btn.addEventListener('click', S.handleQueryModeToggle);
            });
        }

        if (S.els.filterBtns.length) {
            S.els.filterBtns.forEach(function (btn) {
                btn.addEventListener('click', function () {
                    S.els.filterBtns.forEach(function (b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                    S.state.filterType = btn.getAttribute('data-filter') || 'all';
                    S.filterResults();
                });
            });
        }
        if (S.els.filterAuthor) {
            S.els.filterAuthor.addEventListener('change', function () {
                S.state.filterAuthor = S.els.filterAuthor.value;
                S.filterResults();
            });
        }
        if (S.els.keywordFilter) {
            S.els.keywordFilter.addEventListener('input', S.debounce(function () { S.filterResults(); }, 250));
        }
        if (S.els.verifiedOnly) {
            S.els.verifiedOnly.addEventListener('change', function () { S.filterResults(); });
        }
        if (S.els.mediaFilter) {
            S.els.mediaFilter.addEventListener('change', function () { S.filterResults(); });
        }
        if (S.els.selectAll) {
            S.els.selectAll.addEventListener('change', function () {
                var checked = S.els.selectAll.checked;
                var checks = S.els.resultsBody.querySelectorAll('input[type="checkbox"].row-select');
                checks.forEach(function (c) { c.checked = checked; });
            });
        }
        if (S.els.resultsSelectAll) {
            S.els.resultsSelectAll.addEventListener('change', function () {
                var checked = S.els.resultsSelectAll.checked;
                var checks = S.els.resultsBody.querySelectorAll('input[type="checkbox"].row-select');
                checks.forEach(function (c) { c.checked = checked; });
            });
        }

        if (S.els.viewToggle) {
            S.els.viewToggle.addEventListener('click', function (e) {
                var btn = e.target.closest('.view-btn');
                if (!btn) return;
                var view = btn.getAttribute('data-view');
                if (!view) return;
                S.els.viewToggle.querySelectorAll('.view-btn').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                S.state.resultsView = view;
                S.applyResultsView();
            });
        }

        if (S.els.exportCsvBtn) S.els.exportCsvBtn.addEventListener('click', S.exportCSV);
        if (S.els.exportJsonBtn) S.els.exportJsonBtn.addEventListener('click', S.exportJSON);
        if (S.els.refreshBtn) S.els.refreshBtn.addEventListener('click', function () {
            S.updateNotification('Refreshing results...', true, 'loading');
            S.pollForResults(0);
        });
        if (S.els.cancelBtn) S.els.cancelBtn.addEventListener('click', S.cancelScrape);

        S.handleSourceTypeChange();

        /* Hook into GDWallet — auto-authenticate when wallet connects.
         * Use setTimeout to ensure wallet.js autoInit() has already run
         * and set its own onConnect handler (race condition fix). */
        setTimeout(function () {
            if (!window.GDWallet) return;
            var _prevOnConnect = window.GDWallet.onConnect;
            window.GDWallet.onConnect = function (state) {
                /* Call original handler first (updates header button) */
                if (typeof _prevOnConnect === 'function') _prevOnConnect(state);
                /* Auto-authenticate or re-authenticate on account switch */
                if (state && state.address) {
                    S.checkWalletAuth(state.address);
                }
            };
        }, 100);
    };

    S.checkSession = function () {
        var storedKey = null;
        try {
            storedKey = window.localStorage.getItem('guildera_api_key');
            if (storedKey) window.localStorage.removeItem('guildera_api_key');
        } catch (err) { storedKey = null; }

        if (storedKey && S.els.authKeyInput) {
            S.els.authKeyInput.value = storedKey;
            setTimeout(function () { S.handleAuth({ preventDefault: function () { } }); }, 200);
            return;
        }

        var urlParams = new URLSearchParams(window.location.search);
        var apiKeyFromUrl = urlParams.get('api_key') || urlParams.get('key');
        if (apiKeyFromUrl && S.els.authKeyInput) {
            S.els.authKeyInput.value = apiKeyFromUrl;
            window.history.replaceState({}, document.title, window.location.pathname);
            setTimeout(function () { S.handleAuth({ preventDefault: function () { } }); }, 200);
            return;
        }

        /* Check wallet-based auth */
        if (window.GDWallet && window.GDWallet.state.connected && window.GDWallet.state.address) {
            S.checkWalletAuth(window.GDWallet.state.address);
            return;
        }

        S.scraperFetch('guildera_scraper_check_session', {}, function (resp) {
            if (resp.success && resp.data.authenticated) {
                S.state.authenticated = true;
                S.state.rateLimit = resp.data.rate_limit;
                S.state.tier = resp.data.tier || 'free';
                S.state.limits = resp.data.limits || {};
                S.state.apiKey = resp.data.api_key || '';
                S.showAuthenticated(resp.data.key_prefix);
                S.restoreSavedConfig(resp.data.saved_config || {}, resp.data.continuous || false);
            } else {
                S.showAuthForm();
            }
        }, function () {
            S.showAuthForm();
        });
    };

    S.checkWalletAuth = function (address) {
        console.log('[Scraper] checkWalletAuth called for:', address, 'authenticated:', S.state.authenticated, 'prevWallet:', S.state.walletAddress);
        /* If switching to a different account, notify and reset */
        if (S.state.authenticated && S.state.walletAddress && S.state.walletAddress !== address) {
            S.showToast('Wallet account switched — re-authenticating...', 'success');
            S.state.authenticated = false;
        }
        S.state.walletAddress = address;

        var walletStatusUrl = '/wp-json/guildera-x402/v1/wallet-status?wallet=' + encodeURIComponent(address);
        console.log('[Scraper] Fetching wallet-status:', walletStatusUrl);
        fetch(walletStatusUrl)
            .then(function (resp) { return resp.json(); })
            .then(function (data) {
                console.log('[Scraper] wallet-status response:', data);
                if (data.success && data.has_plan && data.api_key) {
                    /* Auto-authenticate with the wallet's API key */
                    if (S.els.authKeyInput) S.els.authKeyInput.value = data.api_key;
                    S.handleAuth({ preventDefault: function () { } });
                } else if (data.success && !data.has_plan) {
                    S.showAuthForm();
                    var errEl = document.getElementById('scraper-auth-error');
                    if (errEl) {
                        errEl.innerHTML = 'No active plan found for this wallet. <a href="/marketplace/" style="color:#ffd700;text-decoration:underline">Purchase a plan</a> to unlock the scraper.';
                        errEl.style.display = 'block';
                    }
                } else {
                    S.showAuthForm();
                }
            })
            .catch(function (err) {
                console.error('[Scraper] wallet-status fetch error:', err);
                S.showAuthForm();
            });
    };

    S.handleAuth = function (e) {
        e.preventDefault();
        var apiKey = S.els.authKeyInput ? S.els.authKeyInput.value.trim() : '';
        if (!apiKey) {
            S.showAuthError('Please enter your API key.');
            return;
        }
        var formData = { api_key: apiKey };
        if (S.els.authCaptcha.style.display !== 'none' && S.els.authCaptcha.style.display !== '') {
            var captchaToken = document.getElementById('captcha-token');
            var captchaAnswer = document.getElementById('captcha-answer');
            if (captchaToken && captchaAnswer) {
                formData.captcha_token = captchaToken.value;
                formData.captcha_answer = captchaAnswer.value;
            }
        }
        S.setAuthLoading(true);
        S.scraperFetch('guildera_scraper_auth', formData, function (resp) {
            if (resp.success) {
                S.state.authenticated = true;
                S.state.tier = resp.data.tier || 'free';
                S.state.limits = resp.data.limits || {};
                S.state.apiKey = resp.data.api_key || '';
                S.state.credits = resp.data.credits || 0;
                S.showAuthenticated(resp.data.key_prefix);
                S.restoreSavedConfig(resp.data.saved_config || {}, resp.data.continuous || false);
                S.showToast('Authentication successful. Welcome!', 'success');
            } else {
                S.setAuthLoading(false);
                if (resp.data && resp.data.captcha) {
                    S.showCaptcha(resp.data.captcha_data);
                    S.showAuthError(resp.data.message);
                } else {
                    S.showAuthError(resp.data ? resp.data.message : 'Authentication failed.');
                }
            }
        }, function () {
            S.setAuthLoading(false);
            S.showAuthError('Connection error. Please try again.');
        });
    };

    S.handleLogout = function (e) {
        e.preventDefault();
        S.scraperFetch('guildera_scraper_logout', {}, function () {
            S.state.authenticated = false;
            S.state.results = [];
            S.showAuthForm();
            S.els.dashboard.style.display = 'none';
            S.showToast('Logged out successfully.', 'success');
        });
    };

    S.handleSwitchWallet = function () {
        if (!window.ethereum) {
            S.showToast('No wallet detected.', 'error');
            return;
        }
        /* eth_requestAccounts opens MetaMask's account picker popup */
        window.ethereum.request({ method: 'eth_requestAccounts' }).then(function (accounts) {
            if (accounts && accounts.length > 0) {
                S.showToast('Switched to ' + accounts[0].substring(0, 6) + '...' + accounts[0].substring(38), 'success');
            }
        }).catch(function (err) {
            console.error('[Scraper] Switch wallet error:', err);
        });
    };

    S.showAuthenticated = function (keyPrefix) {
        S.els.authOverlay.classList.remove('active');
        S.els.authOverlay.classList.add('authenticated');
        if (S.els.authStatus) S.els.authStatus.style.display = 'flex';
        if (S.els.switchWalletBtn) S.els.switchWalletBtn.style.display = window.ethereum ? '' : 'none';
        if (S.els.statusKey) {
            var tierBadge = '';
            if (S.state.tier === 'credit') {
                tierBadge = ' <span style="color:#10b981;font-size:11px;font-weight:bold;">CREDIT</span>';
            } else if (S.state.tier && S.state.tier !== 'free') {
                tierBadge = ' <span style="color:#f59e0b;font-size:11px;font-weight:bold;">PREMIUM</span>';
            } else {
                tierBadge = ' <span style="color:#60a5fa;font-size:11px;font-weight:bold;">FREE</span>';
            }
            S.els.statusKey.innerHTML = (keyPrefix || 'Active') + tierBadge;
        }
        if (S.els.dashboard) S.els.dashboard.style.display = 'block';
        S.loadHistory();
        S.populateApiPanel(keyPrefix);

        if (S.state.tier === 'credit' && typeof S.state.credits !== 'undefined') {
            S.updateCreditsInfo(S.state.credits);
        } else if (typeof S.state.rateLimit !== 'undefined') {
            S.updateRateLimit({ rate_limit: S.state.rateLimit });
        }
        S.applyTierLimits();
    };

    S.showAuthForm = function () {
        S.els.authOverlay.classList.add('active');
        S.els.authOverlay.classList.remove('authenticated');
        if (S.els.authStatus) S.els.authStatus.style.display = 'none';
        if (S.els.authKeyInput) S.els.authKeyInput.value = '';
        S.els.authCaptcha.style.display = 'none';
        S.showAuthError('');
        S.setAuthLoading(false);
    };

    S.applyTierLimits = function () {
        var isPremium = S.state.tier && S.state.tier !== 'free';
        var isCredit = S.state.tier === 'credit';
        var mediaToggle = document.getElementById('scraper-media-only');
        if (mediaToggle) {
            var allowMedia = isPremium || isCredit;
            mediaToggle.disabled = !allowMedia;
            if (!allowMedia) mediaToggle.checked = false;
            var label = mediaToggle.closest('.scraper-toggle') || mediaToggle.parentElement;
            if (label) {
                var existingNote = label.querySelector('.tier-note');
                if (existingNote) existingNote.remove();
                if (!allowMedia) {
                    var note = document.createElement('span');
                    note.className = 'tier-note';
                    note.style.cssText = 'color:#f59e0b;font-size:11px;margin-left:8px;';
                    note.textContent = '(Premium or Credit only)';
                    label.appendChild(note);
                }
            }
        }
        var maxSelect = document.getElementById('scraper-max-results');
        if (maxSelect && !isPremium && !isCredit) {
            var tierMax = S.state.limits.max_results || 25;
            Array.from(maxSelect.options).forEach(function (opt) {
                opt.disabled = parseInt(opt.value, 10) > tierMax;
            });
        }
    };

    S.showAuthError = function (msg) {
        if (S.els.authError) S.els.authError.textContent = msg;
    };

    S.setAuthLoading = function (loading) {
        if (!S.els.authSubmit) return;
        S.els.authSubmit.disabled = loading;
        S.els.authSubmit.textContent = loading ? 'Verifying...' : 'Unlock Scraper';
    };

    S.showCaptcha = function (data) {
        S.els.authCaptcha.style.display = 'block';
        S.els.authCaptcha.innerHTML =
            '<div class="captcha-question">Solve: ' + data.question + ' = ?</div>' +
            '<input type="hidden" id="captcha-token" value="' + data.token + '" />' +
            '<input type="number" id="captcha-answer" placeholder="Enter your answer" autocomplete="off" />';
    };

    S.handleTabSwitch = function (e) {
        var btn = e.currentTarget;
        var target = btn.getAttribute('data-tab');
        if (!target) return;
        S.els.navBtns.forEach(function (b) { b.classList.remove('active'); });
        S.els.panels.forEach(function (p) { p.classList.remove('active'); });
        btn.classList.add('active');
        var panel = document.getElementById('scraper-panel-' + target);
        if (panel) panel.classList.add('active');
        if (target === 'history') S.loadHistory();
        if (target === 'my-data') S.loadMyData(0);
        if (target === 'results' && S.state.unfilteredResults && S.state.unfilteredResults.length > 0) {
            S.applyResultsView();
        }
        if (target === 'configure') {
            S.updateStepBar('configure');
        } else if (target === 'results') {
            S.updateStepBar('results');
        } else if (target === 'my-data') {
            S.updateStepBar('my-data');
        } else if (target === 'history') {
            S.updateStepBar('history');
        }
    };

    S.updateStepBar = function (step) {
        var steps = document.querySelectorAll('.scraper-step');
        steps.forEach(function (s) { s.classList.remove('active'); });
        if (step === 'configure' && steps[0]) steps[0].classList.add('active');
        if (step === 'results' && steps[1]) steps[1].classList.add('active');
        if ((step === 'my-data' || step === 'history') && steps[2]) steps[2].classList.add('active');
        // also sync green step bar visual
        document.querySelectorAll('.scraper-step-bar .scraper-step').forEach(function(s){ s.classList.remove('active'); });
        if (step === 'configure') { var a=document.querySelector('.scraper-step-bar [data-step="1"]'); if(a) a.classList.add('active'); }
        if (step === 'results') { var b=document.querySelector('.scraper-step-bar [data-nav="results"]'); if(b) b.classList.add('active'); }
        if (step === 'my-data' || step === 'history') { var c=document.querySelector('.scraper-step-bar [data-nav="my-data"]'); if(c) c.classList.add('active'); }
    };

    S.updateNavBadges = function () {
        var resultsBadge = document.getElementById('scraper-nav-badge-results');
        var myDataBadge = document.getElementById('scraper-nav-badge-my-data');
        var count = (S.state.unfilteredResults || []).length;
        if (resultsBadge) {
            resultsBadge.textContent = count || '0';
            resultsBadge.style.display = count ? 'inline-flex' : 'none';
        }
        if (myDataBadge) {
            var saved = 0;
            try { saved = (document.querySelectorAll('#scraper-my-data-body tr.data-row') || []).length; } catch (e) { saved = 0; }
            myDataBadge.textContent = saved || '0';
            myDataBadge.style.display = saved ? 'inline-flex' : 'none';
        }
    };

    S.updateStats = function (results) {
        if (!results || !results.length) {
            var setZero = function (id, text) {
                var el = document.getElementById(id);
                if (el) el.textContent = text || '0';
            };
            setZero('stat-posts', '0');
            setZero('stat-users', '0');
            setZero('stat-engagement', '0%');
            setZero('stat-speed', '0 posts/sec');
            return;
        }
        var posts = results.length;
        var users = {};
        var totalEng = 0;
        results.forEach(function (item) {
            var u = item.username || item.author || '';
            if (u) users[u] = true;
            var lk = item.like_count || 0;
            var rt = item.retweet_count || 0;
            var rp = item.reply_count || 0;
            var bm = item.bookmark_count || 0;
            var vw = item.view_count || 0;
            totalEng += (lk + 2 * bm + 3 * rt + (vw > 0 ? 13.5 * rp / vw : 0)) * 1000;
        });
        var uniqueUsers = Object.keys(users).length;
        var avgEng = posts ? Math.round(totalEng / posts) : 0;
        var setVal = function (id, text) {
            var el = document.getElementById(id);
            if (el) el.textContent = text;
        };
        setVal('stat-posts', posts);
        setVal('stat-users', uniqueUsers);
        setVal('stat-engagement', avgEng + '%');
        setVal('stat-speed', posts ? (posts + ' posts') : '0 posts');
    };

    S.updateRateLimit = function (data) {
        var label = document.getElementById('scraper-rate-label');
        var fill = document.getElementById('scraper-rate-fill');
        if (!label || !fill) return;
        var pct = 0;
        if (data && typeof data.rate_limit !== 'undefined' && data.rate_limit !== null && !isNaN(data.rate_limit)) {
            pct = Math.max(0, Math.min(100, Number(data.rate_limit)));
        }
        label.textContent = 'RATE LIMIT: ' + Math.round(pct) + '%';
        fill.style.width = pct + '%';
    };

    S.updateCreditsInfo = function (credits) {
        var label = document.getElementById('scraper-rate-label');
        var fill = document.getElementById('scraper-rate-fill');
        if (!label || !fill) return;
        label.textContent = 'CREDITS: ' + credits;
        var maxCredits = S.state.limits.max_credits || 100;
        var pct = Math.max(0, Math.min(100, (credits / maxCredits) * 100));
        fill.style.width = pct + '%';
    };

    S.handleSourceTypeChange = function () {
        var type = S.els.sourceType ? S.els.sourceType.value : 'user';
        var hints = {
            user: '@username (e.g. @Trail2Crypto)',
            hashtag: '#hashtag (e.g. #Web3)',
            cashtag: '$ticker (e.g. $BTC)',
            keyword: 'Search keyword or phrase',
            url: 'Post URL',
        };
        if (S.els.targetHint) S.els.targetHint.textContent = hints[type] || '';
        if (S.els.target) S.els.target.placeholder = hints[type] || '';
    };

    S.handleQueryModeToggle = function (e) {
        var btn = e.target.closest('.scraper-query-mode');
        if (!btn) return;
        var mode = btn.getAttribute('data-mode');
        document.querySelectorAll('.scraper-query-mode').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var sections = document.querySelectorAll('.scraper-card .scraper-query-section:not(.scraper-collapsible)');
        var rawWrap = document.getElementById('scraper-raw-syntax-wrap');
        if (mode === 'raw') {
            sections.forEach(function (s) { s.style.display = 'none'; });
            if (!rawWrap) {
                var card = document.querySelector('.scraper-card:has(.scraper-query-toggle)');
                if (card) {
                    var sections2 = card.querySelectorAll('.scraper-query-section');
                    var firstSection = sections2[0];
                    rawWrap = document.createElement('div');
                    rawWrap.id = 'scraper-raw-syntax-wrap';
                    rawWrap.className = 'scraper-query-section';
                    rawWrap.innerHTML = '<label class="scraper-section-label">RAW X SEARCH SYNTAX</label>' +
                        '<textarea id="scraper-raw-syntax" class="scraper-raw-textarea" rows="3" placeholder="Enter raw X search syntax..."></textarea>';
                    if (firstSection) firstSection.parentNode.insertBefore(rawWrap, firstSection);
                    else card.appendChild(rawWrap);
                }
            }
            if (rawWrap) rawWrap.style.display = 'block';
        } else {
            sections.forEach(function (s) { s.style.display = ''; });
            if (rawWrap) rawWrap.style.display = 'none';
        }
    };

    S.handleSaveOptionChange = function (e) {
        var opt = e.currentTarget;
        var radio = opt.querySelector('input[type="radio"]');
        if (!radio) return;
        S.els.saveOptions.forEach(function (o) { o.classList.remove('selected'); });
        opt.classList.add('selected');
        radio.checked = true;
        var value = radio.value;
        S.state.storageOption = value;
        if (S.els.ownDbFields) {
            S.els.ownDbFields.classList.toggle('active', value === 'own_db');
        }
        if (S.els.saveBtn) {
            S.els.saveBtn.textContent = value === 'own_db' ? 'Save to Your Database' : 'Save to Guildera Cloud';
        }
    };

    S.buildAdvancedQuery = function () {
        var parts = [];
        var allWords = document.getElementById('adv-all-words');
        var exactPhrase = document.getElementById('adv-exact-phrase');
        var anyWords = document.getElementById('adv-any-words');
        var noneWords = document.getElementById('adv-none-words');
        var hashtags = document.getElementById('adv-hashtags');
        var language = document.getElementById('adv-language');
        var fromAccount = document.getElementById('adv-from-account');
        var toAccount = document.getElementById('adv-to-account');
        var mentionAccount = document.getElementById('adv-mention-account');
        var minReplies = document.getElementById('adv-min-replies');
        var minLikes = document.getElementById('adv-min-likes');
        var minRetweets = document.getElementById('adv-min-reposts');
        var advSince = document.getElementById('adv-since');
        var advUntil = document.getElementById('adv-until');
        var filterReplies = document.getElementById('adv-filter-replies');
        var filterLinks = document.getElementById('adv-filter-links');
        var filterImages = document.getElementById('adv-filter-images');
        var filterVideos = document.getElementById('adv-filter-videos');
        var filterNoRetweets = document.getElementById('adv-no-retweets');
        var filterQuote = document.getElementById('adv-filter-quote');
        var filterVerified = document.getElementById('adv-filter-verified');

        if (allWords && allWords.value.trim()) {
            parts.push(allWords.value.trim());
        }
        if (exactPhrase && exactPhrase.value.trim()) {
            parts.push('"' + exactPhrase.value.trim() + '"');
        }
        if (anyWords && anyWords.value.trim()) {
            var words = anyWords.value.trim().split(/[\s,]+/).filter(Boolean);
            if (words.length === 1) {
                parts.push(words[0]);
            } else if (words.length > 1) {
                parts.push(words.join(' OR '));
            }
        }
        if (noneWords && noneWords.value.trim()) {
            var excluded = noneWords.value.trim().split(/[\s,]+/).filter(Boolean);
            excluded.forEach(function (w) { parts.push('-' + w); });
        }
        if (hashtags && hashtags.value.trim()) {
            var tags = hashtags.value.trim().split(/[\s,]+/).filter(Boolean);
            tags.forEach(function (t) {
                t = t.replace(/^#/, '');
                parts.push('#' + t);
            });
        }
        if (language && language.value.trim()) {
            parts.push('lang:' + language.value.trim());
        }
        if (fromAccount && fromAccount.value.trim()) {
            var handle = fromAccount.value.trim().replace(/^@/, '');
            parts.push('from:' + handle);
        }
        if (toAccount && toAccount.value.trim()) {
            var handle = toAccount.value.trim().replace(/^@/, '');
            parts.push('to:' + handle);
        }
        if (mentionAccount && mentionAccount.value.trim()) {
            var handle = mentionAccount.value.trim().replace(/^@/, '');
            parts.push('@' + handle);
        }
        if (minReplies && parseInt(minReplies.value, 10) > 0) {
            parts.push('min_replies:' + parseInt(minReplies.value, 10));
        }
        if (minLikes && parseInt(minLikes.value, 10) > 0) {
            parts.push('min_faves:' + parseInt(minLikes.value, 10));
        }
        if (minRetweets && parseInt(minRetweets.value, 10) > 0) {
            parts.push('min_retweets:' + parseInt(minRetweets.value, 10));
        }
        if (advSince && advSince.value) {
            parts.push('since:' + advSince.value);
        }
        if (advUntil && advUntil.value) {
            parts.push('until:' + advUntil.value);
        }
        if (filterReplies && filterReplies.value === 'posts') {
            parts.push('-filter:replies');
        }
        if (filterLinks && filterLinks.checked) {
            parts.push('filter:links');
        }
        if (filterImages && filterImages.checked) {
            parts.push('filter:images');
        }
        if (filterVideos && filterVideos.checked) {
            parts.push('filter:videos');
        }
        if (filterNoRetweets && filterNoRetweets.checked) {
            parts.push('-filter:retweets');
        }
        if (filterQuote && filterQuote.checked) {
            parts.push('filter:quote');
        }
        if (filterVerified && filterVerified.checked) {
            parts.push('filter:verified');
        }

        return parts.join(' ');
    };

    // Build query from simple search fields (same format as advanced)
    S.buildSimpleQuery = function () {
        var parts = [];
        var sourceType = S.els.sourceType ? S.els.sourceType.value : 'user';
        var target = S.els.target ? S.els.target.value.trim() : '';
        var sourceAccount = document.getElementById('scraper-source-account');
        var mentionAccount = document.getElementById('scraper-mention-account');
        var hashtags = document.getElementById('scraper-hashtags');
        var excludeKeywords = document.getElementById('scraper-exclude-keywords');
        var minLikes = document.getElementById('scraper-min-likes');
        var minRetweets = document.getElementById('scraper-min-retweets');
        var minReplies = document.getElementById('scraper-min-replies');
        var minViews = document.getElementById('scraper-min-views');
        var startDate = S.els.startDate ? S.els.startDate.value : '';
        var endDate = S.els.endDate ? S.els.endDate.value : '';
        var filterReplies = S.els.filterReplies ? S.els.filterReplies.value : 'all';

        if (target) {
            parts.push(target);
        }
        if (sourceAccount && sourceAccount.value.trim()) {
            var handle = sourceAccount.value.trim().replace(/^@/, '');
            parts.push('from:' + handle);
        }
        if (mentionAccount && mentionAccount.value.trim()) {
            var handle = mentionAccount.value.trim().replace(/^@/, '');
            parts.push('@' + handle);
        }
        if (hashtags && hashtags.value.trim()) {
            var tags = hashtags.value.trim().split(/[\s,]+/).filter(Boolean);
            tags.forEach(function (t) {
                t = t.replace(/^#/, '');
                parts.push('#' + t);
            });
        }
        if (excludeKeywords && excludeKeywords.value.trim()) {
            var excluded = excludeKeywords.value.trim().split(/[\s,]+/).filter(Boolean);
            excluded.forEach(function (w) { parts.push('-' + w); });
        }
        if (minReplies && parseInt(minReplies.value, 10) > 0) {
            parts.push('min_replies:' + parseInt(minReplies.value, 10));
        }
        if (minLikes && parseInt(minLikes.value, 10) > 0) {
            parts.push('min_faves:' + parseInt(minLikes.value, 10));
        }
        if (minRetweets && parseInt(minRetweets.value, 10) > 0) {
            parts.push('min_retweets:' + parseInt(minRetweets.value, 10));
        }
        if (startDate && sourceType !== 'user') {
            parts.push('since:' + startDate);
        }
        if (endDate && sourceType !== 'user') {
            parts.push('until:' + endDate);
        }
        if (filterReplies === 'posts') {
            parts.push('-filter:replies');
        }

        return parts.join(' ');
    };

    S.updateAdvancedPreview = function () {
        var preview = document.getElementById('adv-query-preview');
        if (!preview) return;
        var query = S.buildAdvancedQuery();
        preview.textContent = query || 'Fill in fields above to build your query...';
    };

    S.initAdvancedSearch = function () {
        var modeBtns = document.querySelectorAll('.scraper-search-mode');
        var simpleSection = document.getElementById('scraper-simple-search');
        var advSection = document.getElementById('scraper-advanced-search');
        modeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                modeBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                var mode = btn.getAttribute('data-mode');
                if (mode === 'advanced') {
                    if (simpleSection) simpleSection.style.display = 'none';
                    if (advSection) advSection.style.display = 'block';
                } else {
                    if (simpleSection) simpleSection.style.display = 'block';
                    if (advSection) advSection.style.display = 'none';
                }
            });
        });
        var advFields = document.querySelectorAll('#scraper-advanced-search input, #scraper-advanced-search select');
        advFields.forEach(function (el) {
            el.addEventListener('input', function () { S.updateAdvancedPreview(); });
            el.addEventListener('change', function () { S.updateAdvancedPreview(); });
        });
    };

    S.handleSearch = function (e) {
        try {
            e.preventDefault();
            if (!S.state.authenticated) {
                S.showToast('Please authenticate first.', 'error');
                return;
            }
            if (S.state.searchInProgress) {
                S.showToast('A search is already in progress...', 'warning');
                return;
            }
            var sourceType = S.els.sourceType ? S.els.sourceType.value : 'user';
            var target = S.els.target ? S.els.target.value.trim() : '';
            var maxResults = S.els.maxResults ? parseInt(S.els.maxResults.value, 10) : 10;
            var mediaOnly = S.els.mediaOnly ? S.els.mediaOnly.checked : false;
            var filterReplies = S.els.filterReplies ? S.els.filterReplies.value : 'all';
            var startDate = S.els.startDate ? S.els.startDate.value : '';
            var endDate = S.els.endDate ? S.els.endDate.value : '';
            var sourceAccount = document.getElementById('scraper-source-account');
            var mentionAccount = document.getElementById('scraper-mention-account');
            var hashtags = document.getElementById('scraper-hashtags');
            var excludeKeywords = document.getElementById('scraper-exclude-keywords');
            var minLikes = document.getElementById('scraper-min-likes');
            var minRetweets = document.getElementById('scraper-min-retweets');
            var minReplies = document.getElementById('scraper-min-replies');
            var minViews = document.getElementById('scraper-min-views');
            var sortBy = isAdvanced ? (S.els.advSortBySearch ? S.els.advSortBySearch.value : 'default') : (S.els.sortBySearch ? S.els.sortBySearch.value : 'default');

            var isAdvanced = false;
            var rawQuery = '';
            var activeMode = document.querySelector('.scraper-search-mode.active');
            if (activeMode && activeMode.getAttribute('data-mode') === 'advanced') {
                isAdvanced = true;
                rawQuery = S.buildAdvancedQuery();
            } else {
                // Simple search: build raw_query from filters so GitHub receives it in same format
                rawQuery = S.buildSimpleQuery();
            }

            if (isAdvanced) {
                if (!rawQuery) {
                    S.showToast('Please fill in at least one advanced search field.', 'error');
                    return;
                }
                target = rawQuery;
                sourceType = 'keyword';
                var advMaxResults = document.getElementById('adv-max-results');
                if (advMaxResults) maxResults = parseInt(advMaxResults.value, 10) || 50;
            } else {
                if (!target) {
                    S.showToast('Please enter a search target.', 'error');
                    return;
                }
                // Use built query as target for simple search
                if (rawQuery) {
                    target = rawQuery;
                    sourceType = 'keyword';
                }
            }
            S.state.searchInProgress = true;
            S.state.lastSearchQuery = target || rawQuery || '';
            S.state.sortBy = sortBy || 'default';
            S.state.pollErrors = 0;
            S.state.filterType = 'all';
            S.state.filterAuthor = '';
            S.state.unfilteredResults = [];
            S.state.minLikes = parseInt(minLikes.value, 10) || 0;
            S.state.minRetweets = parseInt(minRetweets.value, 10) || 0;
            S.state.minReplies = parseInt(minReplies.value, 10) || 0;
            S.state.minViews = parseInt(minViews.value, 10) || 0;
            if (S.els.resultsFilters) S.els.resultsFilters.style.display = 'none';
            if (S.els.filterBtns.length) {
                S.els.filterBtns.forEach(function (b) { b.classList.remove('active'); });
                if (S.els.filterBtns[0]) S.els.filterBtns[0].classList.add('active');
            }
            if (S.els.filterAuthor) S.els.filterAuthor.value = '';
            S.setSearchLoading(true);
            var now = new Date();
            S.state.searchStartTime = now.getUTCFullYear() + '-' +
                String(now.getUTCMonth() + 1).padStart(2, '0') + '-' +
                String(now.getUTCDate()).padStart(2, '0') + ' ' +
                String(now.getUTCHours()).padStart(2, '0') + ':' +
                String(now.getUTCMinutes()).padStart(2, '0') + ':' +
                String(now.getUTCSeconds()).padStart(2, '0');
            S.scraperFetch('guildera_scraper_save_config', {
                source_type: sourceType,
                target: target,
                max_results: maxResults,
                media_only: mediaOnly ? '1' : '0',
                filter_replies: filterReplies,
            }, function () { });
            var formData = {
                source_type: sourceType,
                target: target,
                max_results: maxResults,
                media_only: mediaOnly ? '1' : '0',
                filter_replies: filterReplies,
                start_date: startDate,
                end_date: endDate,
                source_account: sourceAccount ? sourceAccount.value.trim() : '',
                mention_account: mentionAccount ? mentionAccount.value.trim() : '',
                hashtags: hashtags ? hashtags.value.trim() : '',
                exclude_keywords: excludeKeywords ? excludeKeywords.value.trim() : '',
                min_likes: minLikes ? parseInt(minLikes.value, 10) || 0 : 0,
                min_retweets: minRetweets ? parseInt(minRetweets.value, 10) || 0 : 0,
                min_replies: minReplies ? parseInt(minReplies.value, 10) || 0 : 0,
                min_views: minViews ? parseInt(minViews.value, 10) || 0 : 0,
                raw_query: rawQuery,
                sort_by: sortBy || 'default',
            };
            S.scraperFetch('guildera_scraper_search', formData, function (resp) {
                if (resp.success && resp.data.triggered) {
                    if (S.state.tier === 'credit' && typeof resp.data.credits_remaining !== 'undefined') {
                        S.state.credits = resp.data.credits_remaining;
                        S.updateCreditsInfo(S.state.credits);
                    }
                    S.updateStepBar('results');
                    S.pollForResults(0);
                } else {
                    S.setSearchLoading(false);
                    S.showToast(resp.data ? resp.data.message : 'Failed to start scraper.', 'error');
                }
            }, function () {
                S.setSearchLoading(false);
                S.showToast('Connection error. Please try again.', 'error');
            });
        } catch (er) {
            S.setSearchLoading(false);
            S.showToast('JavaScript error: ' + er.message, 'error');
        }
    };

    S.pollForResults = function (attempt) {
        if (!S.state.pollErrors) S.state.pollErrors = 0;
        if (attempt > 200) {
            S.setSearchLoading(false);
            S.state.searchInProgress = false;
            S.updateNotification('Timed out. Scraper may have failed.', false, 'error');
            S.showToast('Timed out waiting for results.', 'error');
            return;
        }
        
        // Adaptive progress based on max_results (+5s per stage)
        var maxResults = S.els.maxResults ? parseInt(S.els.maxResults.value, 10) : 25;
        var baseSetupTime = 30;  // Setup/dependencies: ~30-35s
        var perPostTime = 0.8;   // ~0.8s per post
        var processingTime = 10; // Processing: ~10s
        var uploadTime = 10;     // Upload: ~10s
        var expectedDuration = baseSetupTime + (maxResults * perPostTime) + processingTime + uploadTime;
        
        // Calculate progress and stage
        var elapsed = attempt * 5;  // 5s per poll attempt
        var progress = Math.min(92, (elapsed / expectedDuration) * 100);
        var stage = '';
        var substatus = '';
        
        if (attempt === 0) {
            stage = 'Starting scraper...';
            substatus = 'Dispatching workflow...';
            progress = 5;
            S.updateNotification('Starting scraper...', true, 'loading');
        } else if (attempt <= 6) {  // 0-30s: Setup/dependencies
            stage = 'Setting up environment...';
            substatus = 'Installing dependencies...';
            progress = Math.min(35, 5 + (attempt * 5));
            if (attempt === 2) S.updateNotification('Setting up environment...', true, 'loading');
        } else if (elapsed < (baseSetupTime + (maxResults * perPostTime))) {  // Scraping phase
            stage = 'Scraping posts from X...';
            substatus = 'Fetching ' + maxResults + ' posts...';
            var scrapingProgress = ((elapsed - baseSetupTime) / (maxResults * perPostTime)) * 40;
            progress = Math.min(75, 35 + scrapingProgress);
            if (attempt === 7) S.updateNotification('Scraping posts from X...', true, 'loading');
        } else if (elapsed < (expectedDuration - uploadTime)) {  // Processing phase
            stage = 'Processing results...';
            substatus = 'Applying filters...';
            var processingProgress = ((elapsed - baseSetupTime - (maxResults * perPostTime)) / processingTime) * 10;
            progress = Math.min(85, 75 + processingProgress);
            if (attempt >= 11 && attempt <= 12) S.updateNotification('Processing results...', true, 'loading');
        } else {  // Upload phase
            stage = 'Uploading to database...';
            substatus = 'Saving results...';
            progress = Math.min(92, 85 + ((elapsed - (expectedDuration - uploadTime)) / uploadTime) * 7);
            if (attempt >= 14 && attempt <= 15) S.updateNotification('Uploading to database...', true, 'loading');
        }
        
        // Update loading overlay with stage, substatus, and progress
        S.updateLoadingOverlay(stage, progress, substatus);
        
        if (attempt >= 16 && attempt % 8 === 0) {
            S.updateNotification('Still polling (' + attempt + '/80)...', true, 'loading');
        }
        
        var since = S.state.searchStartTime || '';
        var useSince = since;

        setTimeout(function () {
            var pollLimit = S.els.maxResults ? parseInt(S.els.maxResults.value, 10) || 50 : 50;
            S.scraperFetch('guildera_scraper_poll_results', { since: useSince, limit: pollLimit, search_start: S.state.searchStartTime || '', search_query: S.state.lastSearchQuery || '', sort_by: S.state.sortBy || 'default' }, function (resp) {
                S.state.pollErrors = 0;
                console.log('[Scraper] Poll attempt ' + attempt + ':', resp);
                if (resp && resp.success && resp.data && resp.data.count > 0) {
                    S.setSearchLoading(false);
                    S.state.searchInProgress = false;
                    S.updateNotification('Found ' + resp.data.count + ' results!', false, 'success');
                    S.state.results = resp.data.results || [];
                    S.renderResults(S.state.results);
                    S.showToast('Found ' + resp.data.count + ' results!', 'success');
                    if (S.els.saveSection) S.els.saveSection.style.display = 'block';
                    var resultsBtn = document.querySelector('.scraper-nav-btn[data-tab="results"]');
                    if (resultsBtn) resultsBtn.click();
                    var sourceType = S.els.sourceType ? S.els.sourceType.value : 'user';
                    var target = S.els.target ? S.els.target.value.trim() : '';
                    S.scraperFetch('guildera_scraper_save_history', {
                        type: sourceType,
                        target: target,
                        count: resp.data.count,
                    }, function () { S.loadHistory(); });
                } else if (resp && resp.success && resp.data && resp.data.completed) {
                    // Scraper finished but found 0 posts
                    S.setSearchLoading(false);
                    S.state.searchInProgress = false;
                    S.state.pollErrors = 0;
                    S.updateNotification('Scraper completed — 0 posts found for this search.', false, 'info');
                    S.showToast('Scraper completed — 0 posts found.', 'info');
                    return;
                } else {
                    var errMsg = '';
                    if (resp && resp.data && resp.data.message) errMsg = resp.data.message;
                    if (errMsg) {
                        console.error('[Scraper] Poll error:', errMsg);
                        S.setSearchLoading(false);
                        S.state.searchInProgress = false;
                        S.state.pollErrors = 0;
                        S.updateNotification('Error: ' + errMsg, false, 'error');
                        S.showToast(errMsg, 'error');
                        return;
                    }
                    if (attempt >= 100) {
                        S.setSearchLoading(false);
                        S.state.searchInProgress = false;
                        S.state.pollErrors = 0;
                        S.updateNotification('No results found. The scraper may have encountered an error.', false, 'error');
                        S.showToast('No results found. The scraper may have failed.', 'error');
                        return;
                    }
                    S.pollForResults(attempt + 1);
                }
            }, function () {
                S.state.pollErrors++;
                if (S.state.pollErrors >= 5) {
                    S.setSearchLoading(false);
                    S.state.searchInProgress = false;
                    S.state.pollErrors = 0;
                    S.updateNotification('Connection error. Check your network.', false, 'error');
                    S.showToast('Connection error. Stopped polling.', 'error');
                    return;
                }
                S.pollForResults(attempt + 1);
            });
        }, 5000);
    };

    S.setSearchLoading = function (loading) {
        if (loading) {
            S.state.searchInProgress = true;
            if (S.els.loadingOverlay) {
                S.els.loadingOverlay.classList.add('active');
                S.els.loadingOverlay.style.display = 'flex';
            }
            if (S.els.loadingFill) S.els.loadingFill.style.width = '0%';
            if (S.els.loadingPct) S.els.loadingPct.textContent = '0%';
            if (S.els.loadingStatus) S.els.loadingStatus.textContent = 'Starting scraper...';
            if (S.els.loadingSubstatus) S.els.loadingSubstatus.textContent = 'Preparing workflow...';
            S.state.loadingStartTime = Date.now();
        } else {
            S.state.searchInProgress = false;
            if (S.els.loadingOverlay) {
                if (S.els.loadingFill) S.els.loadingFill.style.width = '100%';
                if (S.els.loadingPct) S.els.loadingPct.textContent = '100%';
                if (S.els.loadingStatus) S.els.loadingStatus.textContent = 'Done!';
                if (S.els.loadingSubstatus) S.els.loadingSubstatus.textContent = '';
                setTimeout(function () {
                    if (S.els.loadingOverlay) {
                        S.els.loadingOverlay.classList.remove('active');
                        S.els.loadingOverlay.style.display = 'none';
                    }
                }, 800);
            }
            if (S.els.searchBtn) {
                S.els.searchBtn.disabled = false;
                S.els.searchBtn.textContent = 'SEARCH X';
            }
            clearInterval(S.state.loadingInterval);
            S.hideInlineProgress();
        }
    };

    S.cancelScrape = function () {
        if (!S.state.searchInProgress) return;
        S.state.searchInProgress = false;
        S.state.pollErrors = 0;
        S.setSearchLoading(false);
        S.updateNotification('Scrape cancelled by user.', false, 'error');
        S.showToast('Scrape cancelled.', 'info');
        if (S.els.searchBtn) {
            S.els.searchBtn.disabled = false;
            S.els.searchBtn.textContent = 'SEARCH X';
        }
    };

    S.animateLoadingProgress = function () {
        var startTime = S.state.loadingStartTime || Date.now();
        var maxDuration = 55000;
        S.state.loadingInterval = setInterval(function () {
            var elapsed = Date.now() - startTime;
            var progress = Math.min(95, Math.round((elapsed / maxDuration) * 95));
            if (S.els.progressFill) S.els.progressFill.style.width = progress + '%';
            if (S.els.progressPct) S.els.progressPct.textContent = progress + '%';
            if (S.els.loadingFill) S.els.loadingFill.style.width = progress + '%';
            if (S.els.loadingPct) S.els.loadingPct.textContent = progress + '%';
        }, 500);
    };

    S.updateLoadingOverlay = function (msg, pct, substatus) {
        if (S.els.loadingStatus) S.els.loadingStatus.textContent = msg || '';
        if (S.els.loadingSubstatus) S.els.loadingSubstatus.textContent = substatus || '';
        if (S.els.loadingFill) S.els.loadingFill.style.width = Math.min(95, pct) + '%';
        if (S.els.loadingPct) S.els.loadingPct.textContent = Math.round(pct) + '%';
    };

    S.showInlineProgress = function (msg, pct) {
        if (S.els.inlineProgress) S.els.inlineProgress.style.display = 'block';
        if (S.els.inlineFill) S.els.inlineFill.style.width = Math.min(95, pct) + '%';
        if (S.els.inlineText) S.els.inlineText.textContent = msg || '';
        if (S.els.inlinePct) S.els.inlinePct.textContent = Math.round(pct) + '%';
    };

    S.hideInlineProgress = function () {
        if (S.els.inlineProgress) {
            if (S.els.inlineFill) S.els.inlineFill.style.width = '100%';
            if (S.els.inlinePct) S.els.inlinePct.textContent = '100%';
            if (S.els.inlineText) S.els.inlineText.textContent = 'Done!';
            setTimeout(function () {
                if (S.els.inlineProgress) S.els.inlineProgress.style.display = 'none';
                if (S.els.inlineFill) S.els.inlineFill.style.width = '0%';
            }, 1200);
        }
    };

    S.updateNotification = function (msg, show, type) {
        var bar = document.getElementById('scraper-notification-bar');
        if (!bar) return;
        if (!show || !msg) {
            bar.className = 'scraper-notification-bar';
            return;
        }
        bar.className = 'scraper-notification-bar active ' + (type || 'loading');
        var text = document.getElementById('scraper-notification-text');
        if (text) text.innerHTML = msg;
    };

    S.updatePollProgress = function (attempt) {
        if (!S.els.progressFill) return;
        var pct = Math.min(100, (attempt / 150) * 100);
        S.els.progressFill.style.width = pct + '%';
        var elapsed = Date.now() - (S.state.loadingStartTime || Date.now());
        var overlayPct = Math.min(95, Math.round((elapsed / 120000) * 95));
        S.updateLoadingOverlay('Searching X — collecting posts...', overlayPct);
        S.showInlineProgress('Collecting posts...', overlayPct);
    };

    S.handleSave = function (e) {
        e.preventDefault();
        if (!S.state.authenticated) {
            S.showToast('Please authenticate first.', 'error');
            return;
        }
        if (!S.state.results || S.state.results.length === 0) {
            S.showToast('No results to save. Search first.', 'error');
            return;
        }
        var storageType = S.state.storageOption;
        var formData = {
            results: JSON.stringify(S.state.results),
            storage_type: storageType,
        };
        if (storageType === 'own_db') {
            var customUrl = S.els.ownSupabaseUrl ? S.els.ownSupabaseUrl.value.trim() : '';
            var customKey = S.els.ownSupabaseKey ? S.els.ownSupabaseKey.value.trim() : '';
            if (!customUrl || !customKey) {
                S.showToast('Please enter your Supabase URL and Anon Key.', 'error');
                return;
            }
            formData.supabase_url = customUrl;
            formData.supabase_key = customKey;
        }
        if (S.els.saveBtn) S.els.saveBtn.disabled = true;
        if (S.els.saveStatus) S.els.saveStatus.textContent = 'Saving...';
        S.scraperFetch('guildera_scraper_save_results', formData, function (resp) {
            if (S.els.saveBtn) S.els.saveBtn.disabled = false;
            if (resp.success) {
                if (S.els.saveStatus) S.els.saveStatus.textContent = '';
                S.showToast(resp.data.message || 'Data saved!', 'success');
            } else {
                if (S.els.saveStatus) S.els.saveStatus.textContent = '';
                S.showToast(resp.data ? resp.data.message : 'Failed to save.', 'error');
            }
        }, function () {
            if (S.els.saveBtn) S.els.saveBtn.disabled = false;
            if (S.els.saveStatus) S.els.saveStatus.textContent = '';
            S.showToast('Connection error. Please try again.', 'error');
        });
    };

    S.renderResults = function (results) {
        if (!S.els.resultsBody) return;
        if (!results || results.length === 0) {
            S.els.resultsBody.innerHTML =
                '<tr><td colspan="8"><div class="scraper-empty">' +
                '<div class="empty-icon">&#128269;</div>' +
                '<h3>No results found</h3>' +
                '<p>Try adjusting your search parameters or source type.</p>' +
                '</div></td></tr>';
            if (S.els.resultsCount) S.els.resultsCount.textContent = '';
            if (S.els.exportCsvBtn) S.els.exportCsvBtn.style.display = 'none';
            if (S.els.exportJsonBtn) S.els.exportJsonBtn.style.display = 'none';
            if (S.els.resultsFilters) S.els.resultsFilters.style.display = 'none';
            if (S.els.resultsCards) S.els.resultsCards.style.display = 'none';
            S.updateStats([]);
            S.updateNavBadges();
            return;
        }
        S.state.unfilteredResults = results.slice();
        S.populateAuthorFilter(results);
        S.updateStats(results);
        S.updateNavBadges();
        S.filterResults();
    };

    S.populateAuthorFilter = function (results) {
        if (!S.els.filterAuthor) return;
        var authors = {};
        results.forEach(function (item) {
            var name = item.username || item.author || '';
            if (name && !authors[name]) authors[name] = item.author || name;
        });
        var html = '<option value="">All authors</option>';
        var sorted = Object.keys(authors).sort();
        sorted.forEach(function (key) {
            html += '<option value="' + S.escAttr(key) + '">' + S.escHtml(authors[key]) + ' (' + key + ')</option>';
        });
        S.els.filterAuthor.innerHTML = html;
    };

    S.filterResults = function () {
        var results = S.state.unfilteredResults.slice();
        var filterType = S.state.filterType || 'all';
        var filterAuthor = S.state.filterAuthor || '';
        var keyword = S.els.keywordFilter ? S.els.keywordFilter.value.trim().toLowerCase() : '';
        var verifiedOnly = S.els.verifiedOnly ? S.els.verifiedOnly.checked : false;
        var mediaOnly = S.els.mediaFilter ? S.els.mediaFilter.checked : false;

        if (filterType === 'posts') results = results.filter(function (item) { return !item.is_reply; });
        else if (filterType === 'replies') results = results.filter(function (item) { return !!item.is_reply; });
        if (filterAuthor) results = results.filter(function (item) { return (item.username || '') === filterAuthor; });
        if (keyword) {
            results = results.filter(function (item) {
                var text = (item.text || '').toLowerCase();
                var author = (item.author || '').toLowerCase();
                var username = (item.username || '').toLowerCase();
                return text.indexOf(keyword) !== -1 || author.indexOf(keyword) !== -1 || username.indexOf(keyword) !== -1;
            });
        }
        if (verifiedOnly) results = results.filter(function (item) { return !!item.is_verified || !!item.verified; });
        if (mediaOnly) results = results.filter(function (item) { return item.has_media || (item.media_urls && item.media_urls.length > 0); });
        var minLikes = S.state.minLikes || 0;
        var minRetweets = S.state.minRetweets || 0;
        var minReplies = S.state.minReplies || 0;
        var minViews = S.state.minViews || 0;
        if (minLikes > 0) results = results.filter(function (item) { return (item.like_count || 0) >= minLikes; });
        if (minRetweets > 0) results = results.filter(function (item) { return (item.retweet_count || 0) >= minRetweets; });
        if (minReplies > 0) results = results.filter(function (item) { return (item.reply_count || 0) >= minReplies; });
        if (minViews > 0) results = results.filter(function (item) { return (item.view_count || 0) >= minViews; });

        results = S.sortResults(results);
        S.state.results = results;
        S.applyResultsView();
        if (S.els.resultsFilters) S.els.resultsFilters.style.display = 'flex';
        var totalCount = (S.state.unfilteredResults || []).length;
        if (S.els.filterCount) S.els.filterCount.textContent = results.length + ' of ' + totalCount;
        var label = totalCount === results.length ? totalCount + ' items' : results.length + ' of ' + totalCount;
        if (filterType === 'posts') label = results.length + ' posts';
        else if (filterType === 'replies') label = results.length + ' replies';
        if (S.els.resultsCount) S.els.resultsCount.textContent = label;
        S.updateNavBadges();
    };

    S.sortResults = function (results) {
        var sortVal = 'latest';
        var sortEl = document.getElementById('scraper-sort-results-select');
        if (sortEl) {
            var trigger = sortEl.querySelector('.scraper-custom-select-trigger');
            if (trigger) sortVal = trigger.getAttribute('data-value') || 'latest';
        }
        var sorted = results.slice();
        if (sortVal === 'oldest') {
            sorted.sort(function (a, b) { return new Date(a.created_at || 0) - new Date(b.created_at || 0); });
        } else if (sortVal === 'likes') {
            sorted.sort(function (a, b) { return (b.like_count || 0) - (a.like_count || 0); });
        } else if (sortVal === 'retweets') {
            sorted.sort(function (a, b) { return (b.retweet_count || 0) - (a.retweet_count || 0); });
        } else if (sortVal === 'engagement') {
            sorted.sort(function (a, b) {
                var ea = (a.like_count || 0) + (a.retweet_count || 0) + (a.reply_count || 0) + ((a.view_count || 0) > 0 ? (a.view_count || 0) / 25 : 0);
                var eb = (b.like_count || 0) + (b.retweet_count || 0) + (b.reply_count || 0) + ((b.view_count || 0) > 0 ? (b.view_count || 0) / 25 : 0);
                return eb - ea;
            });
        } else {
            sorted.sort(function (a, b) { return new Date(b.created_at || 0) - new Date(a.created_at || 0); });
        }
        return sorted;
    };

    S.applyResultsView = function () {
        var results = S.state.results || [];
        if (!S.els.resultsBody || !S.els.resultsCards) return;
        if (S.state.resultsView === 'cards') {
            S.els.resultsBody.closest('.scraper-table-wrap').style.display = 'none';
            S.els.resultsCards.style.display = 'grid';
            S.renderResultsCards(results);
        } else {
            S.els.resultsCards.style.display = 'none';
            S.els.resultsBody.closest('.scraper-table-wrap').style.display = 'block';
            S.renderResultsTable(results);
        }
    };

    S.renderResultsCards = function (results) {
        if (!S.els.resultsCards) return;
        if (!results || results.length === 0) {
            S.els.resultsCards.innerHTML = '<div class="scraper-empty"><div class="empty-icon">&#128269;</div><h3>No results found</h3><p>Try adjusting your search parameters.</p></div>';
            return;
        }
        // Cache avatars per username: if one post has avatar, use for all from same author
        var avatarCache = {};
        results.forEach(function (item) {
            if (item.author_avatar && item.username && !avatarCache[item.username]) {
                avatarCache[item.username] = item.author_avatar;
            }
        });
        var html = '';
        results.forEach(function (item) {
            var displayName = item.author || '';
            var displayHandle = item.username || '';
            var displayDate = item.created_at ? S.formatTweetDate(item.created_at) : '&mdash;';

            var parsed = S.parseAuthorFromQuery(displayName, displayHandle);
            displayName = parsed.name;
            displayHandle = parsed.handle;

            var avatarSource = item.author_avatar || (item.username ? avatarCache[item.username] : '') || '';
            var avatarUrl = avatarSource ? (avatarSource.indexOf('pbs.twimg.com') > -1 ? (function(src){ var u = src.replace(/\?.*$/, ''); if (!u.match(/\.jpg$/i)) u += '.jpg'; return u; })(avatarSource) : avatarSource) : '';
            var avatarHtml = avatarUrl
                ? '<img class="card-avatar-img" src="' + S.escAttr(avatarUrl) + '" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'block\';" />'+
                  '<div class="card-avatar-fallback" style="display:none;">' + (displayName || '?').charAt(0).toUpperCase() + '</div>'
                : '<div class="card-avatar-fallback">' + (displayName || '?').charAt(0).toUpperCase() + '</div>';
            var mediaHtml = '';
            var cardMediaUrls = [];
            if (item.media_urls) {
                if (typeof item.media_urls === 'string') {
                    try { cardMediaUrls = JSON.parse(item.media_urls); } catch (e) { cardMediaUrls = []; }
                } else if (Array.isArray(item.media_urls)) {
                    cardMediaUrls = item.media_urls;
                }
            }
            if (cardMediaUrls.length === 0 && item.media_url) {
                cardMediaUrls = [item.media_url];
            }
            if (cardMediaUrls.length === 0 && item.media && typeof item.media === 'string') {
                cardMediaUrls = [item.media];
            }
            if (cardMediaUrls.length === 0 && item.media && Array.isArray(item.media)) {
                cardMediaUrls = item.media;
            }
            if (cardMediaUrls.length > 0 && cardMediaUrls[0]) {
                var preview = cardMediaUrls[0];
                if (typeof preview === 'string') {
                    var fullPreview = preview.includes('?') ? preview : preview + '?format=jpg&name=large';
                    mediaHtml = '<div class="card-media" data-lightbox-url="' + S.escAttr(preview) + '"><img data-src="' + S.imgSrc(fullPreview) + '" alt="" /><span class="card-media-icon">&#x1F4F7;</span></div>';
                }
            }
            var dateFormatted = item.created_at ? S.formatTweetDate(item.created_at) : '&mdash;';
            var likes = (item.like_count || 0) * 1;
            var retweets = (item.retweet_count || 0) * 1;
            var replies = (item.reply_count || 0) * 1;
            var views = (item.view_count || 0) * 1;
            var bookmarks = (item.bookmark_count || 0) * 1;
            var score = (likes + retweets + replies) + (views > 0 ? views / 25 : 0);
            var scoreFormatted = score >= 1000 ? (score / 1000).toFixed(1) + 'k' : Math.round(score);
            html += '<div class="result-card">' +
                '<div class="card-header"><div class="card-author"><div class="card-avatar">' + avatarHtml + '</div>' +
                '<div class="card-author-meta"><div class="author-name">' + S.escHtml(displayName) + '</div>' +
                '<div class="author-handle">' + S.escHtml(displayHandle) + ' &middot; ' + displayDate + '</div></div></div>' +
                '<a href="' + S.escAttr(item.url) + '" target="_blank" rel="noopener noreferrer" class="tweet-action-link" title="Open in X">&#x2197;</a></div>' +
                '<div class="card-body"><div class="card-text">' + S.escHtml(item.text) + '</div>' + mediaHtml + '</div>' +
                (item.post_type ? '<div class="post-type-badge" style="font-size:0.7rem;color:var(--text-dim);margin-top:-4px;">' + item.post_type.toUpperCase() + '</div>' : '') +
                '<div class="card-footer"><div class="card-stats">' +
                '<span class="card-stat" title="Likes">&#x2764; ' + likes.toLocaleString() + '</span>' +
                '<span class="card-stat" title="Retweets">&#x1F4E4; ' + retweets.toLocaleString() + '</span>' +
                '<span class="card-stat" title="Replies">&#x1F4AC; ' + replies.toLocaleString() + '</span>' +
                '<span class="card-stat" title="Views">&#x1F441; ' + views.toLocaleString() + '</span>' +
                (bookmarks > 0 ? '<span class="card-stat" title="Bookmarks">&#x1F516; ' + bookmarks.toLocaleString() + '</span>' : '') +
                '</div><span class="card-virality" title="Engagement Score">Score ' + scoreFormatted + '</span></div></div>';
        });
        S.els.resultsCards.innerHTML = html;
        S.activateLazyImages();
    };

    S.renderResultsTable = function (results) {
        if (!S.els.resultsBody) return;
        var html = '';
        results.forEach(function (item) {
            var engLikes = (item.like_count || 0) * 1;
            var engRetweets = (item.retweet_count || 0) * 1;
            var engReplies = (item.reply_count || 0);
            var engViews = (item.view_count || 0);
            var engagementScore = (engLikes + engRetweets + engReplies) + (engViews > 0 ? engViews / 25 : 0);
            var scoreFormatted = engagementScore >= 1000 ? (engagementScore / 1000).toFixed(1) + 'k' : Math.round(engagementScore);

            var engHtml =
                '<div class="tweet-engagement">' +
                '<span class="eng-item" title="Replies">&#x1F4AC; <span class="eng-num">' + (item.reply_count || 0) + '</span></span>' +
                '<span class="eng-item" title="Retweets">&#x1F4E4; <span class="eng-num">' + (item.retweet_count || 0) + '</span></span>' +
                '<span class="eng-item" title="Likes">&#x2764; <span class="eng-num">' + (item.like_count || 0) + '</span></span>' +
                '<span class="eng-item" title="Views">&#x1F441; <span class="eng-num">' + (item.view_count || 0) + '</span></span>' +
                (item.bookmark_count ? '<span class="eng-item" title="Bookmarks">&#x1F516; <span class="eng-num">' + (item.bookmark_count || 0) + '</span></span>' : '') +
                '</div>';
            var scoreHtml = '<span class="eng-item eng-score" title="Engagement Score">&#x2B50; <span class="eng-num eng-score-num">' + scoreFormatted + '</span></span>';

            var mediaUrls = [];
            if (item.media_urls) {
                if (typeof item.media_urls === 'string') {
                    try { mediaUrls = JSON.parse(item.media_urls); } catch (e) { mediaUrls = []; }
                } else if (Array.isArray(item.media_urls)) {
                    mediaUrls = item.media_urls;
                }
            }
            if (mediaUrls.length === 0 && item.media_url) {
                mediaUrls = [item.media_url];
            }
            if (mediaUrls.length === 0 && item.media && typeof item.media === 'string') {
                mediaUrls = [item.media];
            }
            if (mediaUrls.length === 0 && item.media && Array.isArray(item.media)) {
                mediaUrls = item.media;
            }
            var mediaHtml = '';
            if (mediaUrls.length > 0) {
                mediaHtml = '<div class="media-preview">';
                mediaUrls.slice(0, 2).forEach(function (url) {
                    if (!url || typeof url !== 'string') return;
                    var fullUrl = url.includes('?') ? url : url + '?format=jpg&name=large';
                    if (url.match(/\.(mp4|webm|mov)/i)) {
                        mediaHtml += '<div class="media-btn media-video" data-lightbox-url="' + S.escAttr(url) + '">&#x25B6;</div>';
                    } else {
                        mediaHtml += '<div class="media-btn" data-lightbox-url="' + S.escAttr(url) + '"><img class="media-btn-img" data-src="' + S.imgSrc(fullUrl) + '" alt="" /><span class="media-btn-icon"></span></div>';
                    }
                });
                if (mediaUrls.length > 2) {
                    mediaHtml += '<div class="media-btn media-more-btn" data-lightbox-url="' + S.escAttr(mediaUrls[2]) + '">+' + (mediaUrls.length - 2) + '</div>';
                }
                mediaHtml += '</div>';
            } else if (item.has_media) {
                mediaHtml = '<span class="tweet-media-badge">&#x1F4F7;</span>';
            } else {
                mediaHtml = '<span style="color:var(--text-dim);font-size:0.78rem;">&mdash;</span>';
            }

            var dateFormatted = item.created_at ? S.formatTweetDate(item.created_at) : '&mdash;';
            var replyBadge = item.is_reply ? ' <span class="reply-badge" title="This is a reply">&#x21B3; reply</span>' : '';

            var tblDisplayName = item.author || '';
            var tblDisplayHandle = item.username || '';
            var tblParsed = S.parseAuthorFromQuery(tblDisplayName, tblDisplayHandle);
            tblDisplayName = tblParsed.name;
            tblDisplayHandle = tblParsed.handle;

            var avatarImg = item.author_avatar
                ? '<img class="author-avatar" data-src="' + S.imgSrc(item.author_avatar) + '" alt="' + S.escAttr(tblDisplayName) + '" />'
                : '';
            html += '<tr>' +
                '<td><input type="checkbox" class="row-select" data-id="' + S.escAttr(item.id || '') + '" /></td>' +
                '<td><div class="tweet-author">' + avatarImg +
                '<div><span class="author-name">' + S.escHtml(tblDisplayName) + replyBadge + '</span><span class="author-handle">' + S.escHtml(tblDisplayHandle) + '</span></div></div></td>' +
                '<td class="tweet-text">' + S.escHtml(item.text) + '</td>' +
                '<td class="tweet-date">' + dateFormatted + '</td>' +
                '<td>' + engHtml + '</td>' +
                '<td>' + scoreHtml + '</td>' +
                '<td>' + mediaHtml + '</td>' +
                '<td><a href="' + S.escAttr(item.url) + '" target="_blank" rel="noopener noreferrer" class="tweet-action-link" title="Open in X">&#x2197;</a></td>' +
                '</tr>';
        });
        S.els.resultsBody.innerHTML = html;
        S.activateLazyImages();
        if (S.els.resultsCount) S.els.resultsCount.textContent = results.length + ' posts';
        if (S.els.exportCsvBtn) S.els.exportCsvBtn.style.display = 'inline-flex';
        if (S.els.exportJsonBtn) S.els.exportJsonBtn.style.display = 'inline-flex';
        if (S.els.resultsFilters) S.els.resultsFilters.style.display = 'flex';
    };

    S.parseAuthorFromQuery = function (author, username) {
        var name = author || '';
        var handle = username || '';
        if (!name) return { name: name, handle: handle };

        // Try from:handle pattern first
        var fromMatch = name.match(/\bfrom[:\s]+@?(\w+)/i);
        if (fromMatch) {
            return { name: fromMatch[1], handle: '@' + fromMatch[1] };
        }

        // Check if it looks like a raw query (contains query operators)
        var queryOps = /\b(since|until|filter|min_replies|min_likes|min_retweets|exact|any|none|from|to|mention|lang):\S/i;
        if (queryOps.test(name)) {
            // It's a raw query, not an author name — try to extract first meaningful term
            var firstTerm = name.split(/\s+/)[0] || '';
            // If it's a cashtag or hashtag, show it
            if (/^[#$]/.test(firstTerm) && firstTerm.length > 1) {
                return { name: firstTerm, handle: '' };
            }
            return { name: 'Search Result', handle: '' };
        }

        return { name: name, handle: handle };
    };

    S.formatTweetDate = function (dateStr) {
        if (!dateStr) return '&mdash;';
        var d = new Date(dateStr + 'Z');
        if (isNaN(d.getTime())) return S.escHtml(dateStr);
        return d.toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
        }) + ' ' + d.toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit', hour12: true,
        });
    };

    S.escapeHtml = function (str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    };

    S.escHtml = function (s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    S.escAttr = function (s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    S.debounce = function (fn, delay) {
        var timer;
        return function () {
            var ctx = this, args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
        };
    };

    S.showToast = function (msg, type) {
        if (!S.els.toast || !S.els.toastMsg) return;
        S.els.toastMsg.textContent = msg;
        S.els.toast.className = 'scraper-toast show toast-' + (type || 'info');
        clearTimeout(S.state.toastTimer);
        S.state.toastTimer = setTimeout(function () {
            S.els.toast.className = 'scraper-toast';
        }, 4000);
    };

    S.openLightbox = function (url) {
        var lb = document.getElementById('scraper-lightbox');
        var img = document.getElementById('scraper-lightbox-img');
        if (!lb || !img) return;
        var fullUrl = url && url.indexOf('?') === -1 ? url + '?format=jpg&name=large' : url;
        img.src = fullUrl;
        lb.classList.add('active');
    };

    S.closeLightbox = function () {
        var lb = document.getElementById('scraper-lightbox');
        if (lb) lb.classList.remove('active');
    };

    S.testConnection = function () {
        if (!S.state.authenticated) {
            S.showToast('Please authenticate first.', 'error');
            return;
        }
        S.showToast('Connection OK! API key validated.', 'success');
    };

    S.populateApiPanel = function (keyPrefix) {
        /* API panel removed from new design — no-op */
    };

    S.restoreSavedConfig = function (config, continuous) {
        if (!config) return;
        if (config.source_type && S.els.sourceType) S.els.sourceType.value = config.source_type;
        if (config.target && S.els.target) S.els.target.value = config.target;
        if (config.max_results && S.els.maxResults) S.els.maxResults.value = config.max_results;
        if (config.media_only && S.els.mediaOnly) S.els.mediaOnly.checked = config.media_only === '1' || config.media_only === true;
        if (config.filter_replies && S.els.filterReplies) S.els.filterReplies.value = config.filter_replies;
        if (config.start_date && S.els.startDate) S.els.startDate.value = config.start_date;
        if (config.end_date && S.els.endDate) S.els.endDate.value = config.end_date;
        if (typeof continuous !== 'undefined') {
            if (S.els.continuousToggle) S.els.continuousToggle.checked = !!continuous;
            if (S.els.continuousStatus) {
                S.els.continuousStatus.textContent = continuous ? 'Active' : 'Inactive';
                S.els.continuousStatus.className = 'scraper-continuous-status ' + (continuous ? 'active' : '');
            }
        }
        S.handleSourceTypeChange();
    };

    S.handleContinuousToggle = function () {
        var enabled = S.els.continuousToggle ? S.els.continuousToggle.checked : false;
        S.scraperFetch('guildera_scraper_toggle_continuous', { enabled: enabled ? '1' : '0' }, function (resp) {
            if (resp.success) {
                if (S.els.continuousStatus) {
                    S.els.continuousStatus.textContent = enabled ? 'Active' : 'Inactive';
                    S.els.continuousStatus.className = 'scraper-continuous-status ' + (enabled ? 'active' : '');
                }
                S.showToast(enabled ? '24/7 mode enabled. Scraping will run automatically.' : '24/7 mode disabled.', 'success');
            } else {
                if (S.els.continuousToggle) S.els.continuousToggle.checked = !enabled;
                S.showToast(resp.data ? resp.data.message : 'Failed to toggle 24/7 mode.', 'error');
            }
        }, function () {
            if (S.els.continuousToggle) S.els.continuousToggle.checked = !enabled;
            S.showToast('Connection error.', 'error');
        });
    };

    S.handleClearHistory = function () {
        if (!confirm('Clear all scraping history? This cannot be undone.')) return;
        S.scraperFetch('guildera_scraper_clear_history', {}, function (resp) {
            if (resp.success) {
                S.showToast('History cleared.', 'success');
                S.loadHistory();
            } else {
                S.showToast(resp.data ? resp.data.message : 'Failed to clear history.', 'error');
            }
        }, function () {
            S.showToast('Connection error.', 'error');
        });
    };

    S.handleQueryReset = function () {
        if (S.els.sourceType) S.els.sourceType.value = 'user';
        if (S.els.target) S.els.target.value = '';
        if (S.els.maxResults) S.els.maxResults.value = '10';
        if (S.els.mediaOnly) S.els.mediaOnly.checked = false;
        if (S.els.filterReplies) S.els.filterReplies.value = 'all';
        if (S.els.startDate) S.els.startDate.value = '';
        if (S.els.endDate) S.els.endDate.value = '';
        var hashtags = document.getElementById('scraper-hashtags');
        var exclude = document.getElementById('scraper-exclude-keywords');
        var sourceAccount = document.getElementById('scraper-source-account');
        var mentionAccount = document.getElementById('scraper-mention-account');
        if (hashtags) hashtags.value = '';
        if (exclude) exclude.value = '';
        if (sourceAccount) sourceAccount.value = '';
        if (mentionAccount) mentionAccount.value = '';
        S.handleSourceTypeChange();
        S.showToast('Query reset.', 'info');
    };

    S.loadHistory = function () {
        if (!S.els.historyList) return;
        S.els.historyList.innerHTML = '<div class="scraper-loading"><div class="scraper-spinner"></div> Loading history...</div>';
        S.scraperFetch('guildera_scraper_load_history', {}, function (resp) {
            if (resp.success && resp.data && resp.data.history && resp.data.history.length > 0) {
                var html = '';
                resp.data.history.forEach(function (h) {
                    var timeAgo = S.timeAgo(h.created_at);
                    html += '<div class="scraper-history-item" data-target="' + S.escAttr(h.target) + '" data-type="' + S.escAttr(h.type) + '">' +
                        '<span class="h-type">' + S.escHtml(h.type) + '</span>' +
                        '<span class="h-target">' + S.escHtml(h.target) + '</span>' +
                        '<span class="h-count">' + (h.count || 0) + ' posts</span>' +
                        '<span class="h-time">' + timeAgo + '</span>' +
                        '<span class="h-latency">' + (h.latency ? h.latency + 's' : '') + '</span>' +
                        '<span class="h-status">completed</span>' +
                        '<button class="btn-scraper btn-scraper-xs btn-scraper-ghost scraper-rerun-btn" title="Rerun this search">&#8635;</button>' +
                        '</div>';
                });
                S.els.historyList.innerHTML = html;
                S.els.historyList.querySelectorAll('.scraper-rerun-btn').forEach(function (btn) {
                    btn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        var item = btn.closest('.scraper-history-item');
                        if (item) {
                            var target = item.getAttribute('data-target');
                            var type = item.getAttribute('data-type');
                            if (S.els.target) S.els.target.value = target;
                            if (S.els.sourceType) S.els.sourceType.value = type;
                            S.handleSourceTypeChange();
                            S.handleTabSwitch({ currentTarget: document.querySelector('.scraper-nav-btn[data-tab="configure"]') });
                        }
                    });
                });
            } else {
                S.els.historyList.innerHTML = '<div class="scraper-empty"><div class="empty-icon">&#128336;</div><h3>No history yet</h3><p>Your completed scraping jobs will appear here.</p></div>';
            }
        }, function () {
            S.els.historyList.innerHTML = '<div class="scraper-empty"><p>Failed to load history.</p></div>';
        });
    };

    S.timeAgo = function (dateStr) {
        if (!dateStr) return '';
        var now = new Date();
        var d = new Date(dateStr + 'Z');
        var diff = Math.floor((now - d) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        return Math.floor(diff / 86400) + 'd ago';
    };

    S.loadMyData = function (page) {
        S.state.myDataExpandedQuery = '';
        if (S.els.myDataGroupsView) S.els.myDataGroupsView.style.display = '';
        if (S.els.myDataExpandedView) S.els.myDataExpandedView.style.display = 'none';
        if (!S.els.myDataGroupsBody) return;
        S.els.myDataGroupsBody.innerHTML = '<tr><td colspan="5"><div class="scraper-loading"><div class="scraper-spinner"></div> Loading saved data...</div></td></tr>';
        var filter = S.els.myDataFilter ? S.els.myDataFilter.value.trim() : '';
        S.scraperFetch('guildera_scraper_my_data_groups', { page: page, limit: S.state.myDataLimit, filter: filter }, function (resp) {
            if (resp.success && resp.data && resp.data.groups && resp.data.groups.length > 0) {
                S.state.myDataGroups = resp.data.groups;
                S.state.myDataGroupsTotal = resp.data.total_groups || 0;
                S.state.myDataGroupsPage = page;
                S.renderMyDataGroups(resp.data.groups, resp.data.total_groups);
            } else {
                S.els.myDataGroupsBody.innerHTML = '<tr><td colspan="5"><div class="scraper-empty"><div class="empty-icon">&#128451;</div><h3>No saved data</h3><p>Search for posts and scrape to store your data here.</p></div></td></tr>';
                if (S.els.myDataCount) S.els.myDataCount.textContent = '0 groups';
                S.updateNavBadges();
            }
        }, function () {
            S.els.myDataGroupsBody.innerHTML = '<tr><td colspan="5"><div class="scraper-empty"><p>Failed to load data.</p></div></td></tr>';
        });
    };

    S.renderMyDataGroups = function (groups, total) {
        var html = '';
        groups.forEach(function (g) {
            var query = g.search_query || '(untitled)';
            var lastScraped = g.last_scraped ? S.timeAgo(g.last_scraped) : '&mdash;';
            var topVirality = S.formatEngagementNum ? S.formatEngagementNum(parseInt(g.top_virality) || 0) : (parseInt(g.top_virality) || 0);
            html += '<tr class="data-row group-row">' +
                '<td><span class="group-query">' + S.escHtml(query) + '</span></td>' +
                '<td><span class="group-count">' + (g.post_count || 0) + ' posts</span></td>' +
                '<td><span class="group-date">' + lastScraped + '</span></td>' +
                '<td><span class="group-virality">Score ' + topVirality + '</span></td>' +
                '<td class="group-actions">' +
                    '<button class="btn-scraper btn-scraper-xs btn-scraper-primary group-open-btn" data-query="' + S.escAttr(query) + '">Open</button> ' +
                    '<button class="btn-scraper btn-scraper-xs btn-scraper-accent group-rescrape-btn" data-query="' + S.escAttr(query) + '">&#x21BB; Re-Scrape</button> ' +
                    '<button class="btn-scraper btn-scraper-xs btn-scraper-ghost group-rename-btn" data-query="' + S.escAttr(query) + '">Rename</button> ' +
                    '<button class="btn-scraper btn-scraper-xs btn-scraper-ghost btn-scraper-danger group-delete-btn" data-query="' + S.escAttr(query) + '">Delete</button>' +
                '</td>' +
                '</tr>';
        });
        S.els.myDataGroupsBody.innerHTML = html;
        if (S.els.myDataCount) S.els.myDataCount.textContent = (total || 0) + ' groups';
        S.renderMyDataGroupsPagination(total);
        S.updateNavBadges();
        S.els.myDataGroupsBody.querySelectorAll('.group-open-btn').forEach(function (btn) {
            btn.addEventListener('click', function () { S.expandGroup(btn.getAttribute('data-query')); });
        });
        S.els.myDataGroupsBody.querySelectorAll('.group-rescrape-btn').forEach(function (btn) {
            btn.addEventListener('click', function () { S.reScrapeGroup(btn.getAttribute('data-query'), btn); });
        });
        S.els.myDataGroupsBody.querySelectorAll('.group-rename-btn').forEach(function (btn) {
            btn.addEventListener('click', function () { S.renameGroup(btn.getAttribute('data-query')); });
        });
        S.els.myDataGroupsBody.querySelectorAll('.group-delete-btn').forEach(function (btn) {
            btn.addEventListener('click', function () { S.deleteGroup(btn.getAttribute('data-query')); });
        });
    };

    S.renderMyDataGroupsPagination = function (total) {
        if (!S.els.myDataGroupsPagination) return;
        var pages = Math.ceil(total / S.state.myDataLimit);
        if (pages <= 1) { S.els.myDataGroupsPagination.innerHTML = ''; return; }
        var html = '';
        for (var i = 0; i < pages; i++) {
            html += '<button class="btn-scraper btn-scraper-xs ' + (i === S.state.myDataGroupsPage ? 'btn-scraper-primary' : 'btn-scraper-ghost') + '" data-page="' + i + '">' + (i + 1) + '</button>';
        }
        S.els.myDataGroupsPagination.innerHTML = html;
        S.els.myDataGroupsPagination.querySelectorAll('button').forEach(function (btn) {
            btn.addEventListener('click', function () {
                S.loadMyData(parseInt(btn.getAttribute('data-page'), 10));
            });
        });
    };

    S.expandGroup = function (searchQuery) {
        S.state.myDataExpandedQuery = searchQuery;
        if (S.els.myDataGroupsView) S.els.myDataGroupsView.style.display = 'none';
        if (S.els.myDataExpandedView) S.els.myDataExpandedView.style.display = '';
        if (S.els.myDataExpandedTitle) S.els.myDataExpandedTitle.textContent = searchQuery || '(untitled)';
        if (S.els.myDataBody) S.els.myDataBody.innerHTML = '<tr><td colspan="8"><div class="scraper-loading"><div class="scraper-spinner"></div> Loading posts...</div></td></tr>';
        S.scraperFetch('guildera_scraper_my_data_posts', { search_query: searchQuery }, function (resp) {
            if (resp.success && resp.data && resp.data.results && resp.data.results.length > 0) {
                S.state.myData = resp.data.results;
                S.renderMyDataPosts(resp.data.results);
            } else {
                S.els.myDataBody.innerHTML = '<tr><td colspan="8"><div class="scraper-empty"><p>No posts found.</p></div></td></tr>';
            }
        }, function () {
            S.els.myDataBody.innerHTML = '<tr><td colspan="8"><div class="scraper-empty"><p>Failed to load posts.</p></div></td></tr>';
        });
    };

    S.renderMyDataPosts = function (results) {
        var html = '';
        results.forEach(function (item) {
            var dateFormatted = item.created_at ? S.formatTweetDate(item.created_at) : '&mdash;';
            var displayName = item.author || '';
            var displayHandle = item.username || '';
            var parsed = S.parseAuthorFromQuery(displayName, displayHandle);
            displayName = parsed.name;
            displayHandle = parsed.handle;
            var mediaHtml = '';
            var myMediaUrls = [];
            if (item.media_urls) {
                if (typeof item.media_urls === 'string') {
                    try { myMediaUrls = JSON.parse(item.media_urls); } catch (e) { myMediaUrls = []; }
                } else if (Array.isArray(item.media_urls)) {
                    myMediaUrls = item.media_urls;
                }
            }
            if (myMediaUrls.length > 0) {
                mediaHtml = '<div class="media-preview">';
                myMediaUrls.slice(0, 2).forEach(function (url) {
                    var fullUrl = url.includes('?') ? url : url + '?format=jpg&name=large';
                    if (url.match(/\.(mp4|webm|mov)/i)) {
                        mediaHtml += '<div class="media-btn media-video" data-lightbox-url="' + S.escAttr(url) + '">&#x25B6;</div>';
                    } else {
                        mediaHtml += '<div class="media-btn" data-lightbox-url="' + S.escAttr(url) + '"><img class="media-btn-img" data-src="' + S.imgSrc(fullUrl) + '" alt="" /></div>';
                    }
                });
                mediaHtml += '</div>';
            }
            var engagement = '<div class="tweet-engagement">' +
                '<span class="eng-item">&#10084; ' + (item.like_count || 0) + '</span>' +
                '<span class="eng-item">&#128260; ' + (item.retweet_count || 0) + '</span>' +
                '<span class="eng-item">&#128172; ' + (item.reply_count || 0) + '</span>' +
                '<span class="eng-item">&#128065; ' + (item.view_count || 0) + '</span>' +
                '</div>';
            html += '<tr class="data-row">' +
                '<td><input type="checkbox" class="row-select" data-id="' + S.escAttr(item.id || '') + '" /></td>' +
                '<td><div class="tweet-author"><span class="author-name">' + S.escHtml(displayName) + '</span><span class="author-handle">' + S.escHtml(displayHandle) + '</span></div></td>' +
                '<td class="tweet-text">' + S.escHtml(item.text).substring(0, 150) + (item.text && item.text.length > 150 ? '...' : '') + '</td>' +
                '<td>' + engagement + '</td>' +
                '<td>' + mediaHtml + '</td>' +
                '<td class="tweet-date">' + dateFormatted + '</td>' +
                '<td><a href="' + S.escAttr(item.url) + '" target="_blank" rel="noopener noreferrer" class="tweet-action-link" title="Open in X">&#x2197;</a></td>' +
                '</tr>';
        });
        S.els.myDataBody.innerHTML = html;
        S.activateLazyImages();
        if (S.els.myDataExpandedCount) S.els.myDataExpandedCount.textContent = results.length + ' posts';
        if (S.els.myDataExport) S.els.myDataExport.style.display = results.length > 0 ? 'inline-flex' : 'none';
        if (S.els.myDataDelete) S.els.myDataDelete.style.display = results.length > 0 ? 'inline-flex' : 'none';
    };

    S.renameGroup = function (oldQuery) {
        var newQuery = prompt('Rename search group:', oldQuery);
        if (newQuery === null || newQuery.trim() === '' || newQuery === oldQuery) return;
        S.scraperFetch('guildera_scraper_rename_group', { old_query: oldQuery, new_query: newQuery.trim() }, function (resp) {
            if (resp.success) {
                S.showToast('Renamed to "' + newQuery.trim() + '"', 'success');
                S.loadMyData(S.state.myDataGroupsPage);
            } else {
                S.showToast(resp.data ? resp.data.message : 'Rename failed.', 'error');
            }
        }, function () {
            S.showToast('Connection error.', 'error');
        });
    };

    S.deleteGroup = function (searchQuery) {
        if (!confirm('Delete all posts from "' + searchQuery + '"? This cannot be undone.')) return;
        S.scraperFetch('guildera_scraper_delete_group', { search_query: searchQuery }, function (resp) {
            if (resp.success) {
                S.showToast('Deleted group "' + searchQuery + '"', 'success');
                S.loadMyData(S.state.myDataGroupsPage);
            } else {
                S.showToast(resp.data ? resp.data.message : 'Delete failed.', 'error');
            }
        }, function () {
            S.showToast('Connection error.', 'error');
        });
    };

    S.reScrapeGroup = function (query, btn) {
        if (!query) return;
        if (btn) { btn.disabled = true; btn.innerHTML = '&#8987; Scraping...'; }
        var sourceType = 'keyword';
        if (query.charAt(0) === '#') sourceType = 'hashtag';
        else if (query.charAt(0) === '$') sourceType = 'cashtag';
        var now = new Date();
        S.state.searchStartTime = now.getUTCFullYear() + '-' +
            String(now.getUTCMonth() + 1).padStart(2, '0') + '-' +
            String(now.getUTCDate()).padStart(2, '0') + ' ' +
            String(now.getUTCHours()).padStart(2, '0') + ':' +
            String(now.getUTCMinutes()).padStart(2, '0') + ':' +
            String(now.getUTCSeconds()).padStart(2, '0');
        S.setSearchLoading(true);
        S.state.lastSearchQuery = query;
        S.updateStepBar('results');
        var formData = {
            source_type: sourceType,
            target: query,
            max_results: 25,
            media_only: '0',
            filter_replies: '',
            raw_query: query,
            sort_by: 'default',
        };
        S.scraperFetch('guildera_scraper_search', formData, function (resp) {
            if (resp.success && resp.data.triggered) {
                S.showToast('Re-scraping "' + query + '"...', 'success');
                S.pollForResults(0);
            } else {
                S.setSearchLoading(false);
                if (btn) { btn.disabled = false; btn.innerHTML = '&#x21BB; Re-Scrape'; }
                S.showToast(resp.data ? resp.data.message : 'Failed to start scraper.', 'error');
            }
        }, function () {
            S.setSearchLoading(false);
            if (btn) { btn.disabled = false; btn.innerHTML = '&#x21BB; Re-Scrape'; }
            S.showToast('Connection error.', 'error');
        });
    };

    S.handleMyDataSelectAll = function () {
        var checked = S.els.myDataSelectAll.checked;
        var checks = S.els.myDataBody.querySelectorAll('input[type="checkbox"].row-select');
        checks.forEach(function (c) { c.checked = checked; });
    };

    S.handleMyDataExport = function () {
        var selected = [];
        S.els.myDataBody.querySelectorAll('input[type="checkbox"].row-select:checked').forEach(function (c) {
            var id = c.getAttribute('data-id');
            var item = S.state.myData.find(function (d) { return String(d.id) === id; });
            if (item) selected.push(item);
        });
        var data = selected.length > 0 ? selected : S.state.myData;
        if (!data || data.length === 0) {
            S.showToast('No data to export.', 'error');
            return;
        }
        S.exportData(data, 'guildera_my_data');
    };

    S.handleMyDataDelete = function () {
        var ids = [];
        S.els.myDataBody.querySelectorAll('input[type="checkbox"].row-select:checked').forEach(function (c) {
            ids.push(c.getAttribute('data-id'));
        });
        if (ids.length === 0) {
            S.showToast('Select items to delete.', 'error');
            return;
        }
        if (!confirm('Delete ' + ids.length + ' items? This cannot be undone.')) return;
        S.scraperFetch('guildera_scraper_delete_my_data', { ids: JSON.stringify(ids) }, function (resp) {
            if (resp.success) {
                S.showToast('Deleted ' + ids.length + ' items.', 'success');
                S.expandGroup(S.state.myDataExpandedQuery);
            } else {
                S.showToast(resp.data ? resp.data.message : 'Delete failed.', 'error');
            }
        }, function () {
            S.showToast('Connection error.', 'error');
        });
    };

    S.exportCSV = function () {
        S.exportData(S.state.results, 'guildera_scrape');
    };

    S.exportJSON = function () {
        S.exportData(S.state.results, 'guildera_scrape');
    };

    S.exportData = function (data, filename) {
        if (!data || data.length === 0) {
            S.showToast('No data to export.', 'error');
            return;
        }
        var json = JSON.stringify(data, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = (filename || 'guildera_export') + '_' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        S.showToast('Exported ' + data.length + ' posts.', 'success');
    };

    S.initCustomSelects = function () {
        document.addEventListener('click', function (e) {
            var trigger = e.target.closest('.scraper-custom-select-trigger');
            if (trigger) {
                var select = trigger.closest('.scraper-custom-select');
                if (select) {
                    var isOpen = select.classList.contains('open');
                    document.querySelectorAll('.scraper-custom-select.open').forEach(function (s) { s.classList.remove('open'); });
                    if (!isOpen) select.classList.add('open');
                }
                return;
            }
            var option = e.target.closest('.scraper-custom-select-option');
            if (option) {
                var parentSelect = option.closest('.scraper-custom-select');
                if (parentSelect) {
                    var val = option.getAttribute('data-value');
                    var label = option.textContent;
                    var trig = parentSelect.querySelector('.scraper-custom-select-trigger');
                    if (trig) {
                        trig.setAttribute('data-value', val);
                        trig.querySelector('span').textContent = label;
                    }
                    parentSelect.querySelectorAll('.scraper-custom-select-option').forEach(function (o) { o.classList.remove('selected'); });
                    option.classList.add('selected');
                    parentSelect.classList.remove('open');
                    S.filterResults();
                }
                return;
            }
            document.querySelectorAll('.scraper-custom-select.open').forEach(function (s) { s.classList.remove('open'); });
        });
    };

    S.initCollapsible = function () {
        document.querySelectorAll('.scraper-section-header[data-toggle]').forEach(function (header) {
            header.addEventListener('click', function () {
                var targetId = header.getAttribute('data-toggle');
                var body = document.getElementById(targetId);
                if (body) {
                    var isOpen = body.classList.contains('open');
                    body.classList.toggle('open', !isOpen);
                    header.querySelector('.scraper-chevron').textContent = isOpen ? '\u25BC' : '\u25B2';
                }
            });
        });
    };

    S.DEFAULT_PRESETS = {
        'crypto-depin': { label: 'Crypto & DePIN Alpha', target: '$RMV OR $ONDO OR #Web3 OR #DePIN OR #RWA', source_type: 'keyword', max_results: 25 },
        'ai-agents': { label: 'AI Agents & LLM Graphs', target: '#AIAgents OR #LLM OR #AIGraph OR "artificial intelligence"', source_type: 'keyword', max_results: 25 },
        'viral-tech': { label: 'Viral Tech Deep-Dives', target: '#TechNews OR #Startup OR #Innovation OR #SaaS', source_type: 'keyword', max_results: 25 },
        'visual-chart': { label: 'Visual Chart & Infographic Feed', target: 'chart OR infographic OR #DataViz OR #CryptoChart', source_type: 'keyword', max_results: 25, media_only: true },
    };
    S.getPresets = function () {
        try {
            var c = JSON.parse(localStorage.getItem('guildera_presets') || 'null');
            if (c && typeof c === 'object') return c;
        } catch (e) {}
        return JSON.parse(JSON.stringify(S.DEFAULT_PRESETS));
    };
    S.savePresets = function (data) {
        try { localStorage.setItem('guildera_presets', JSON.stringify(data)); } catch (e) {}
        if (S.els.presetsCount) S.els.presetsCount.textContent = Object.keys(data).length;
        // sync cross-browser via backend
        S.scraperFetch('guildera_save_presets', { presets: JSON.stringify(data) }, function(){}, function(){});
    };
    S.fetchPresetsFromBackend = function () {
        S.scraperFetch('guildera_get_presets', {}, function(resp){
            if (resp && resp.success && resp.data && resp.data.presets && typeof resp.data.presets === 'object' && Object.keys(resp.data.presets).length) {
                try { localStorage.setItem('guildera_presets', JSON.stringify(resp.data.presets)); } catch(e){}
                if (S.els.presetsCount) S.els.presetsCount.textContent = Object.keys(resp.data.presets).length;
                S.renderPresets();
            }
        }, function(){});
    };
    S.renderPresets = function () {
        var row = document.querySelector('.scraper-presets-row'); if (!row) return;
        var data = S.getPresets(); row.innerHTML = '';
        Object.keys(data).forEach(function (k) { var p = data[k]; var b = document.createElement('button'); b.className = 'scraper-preset-chip'; b.setAttribute('data-preset', k); b.textContent = '◆ ' + (p.label || k); b.addEventListener('click', function () { if (S.els.sourceType) S.els.sourceType.value = p.source_type || 'keyword'; if (S.els.target) S.els.target.value = p.target || ''; if (S.els.maxResults) S.els.maxResults.value = p.max_results || 25; if (S.els.mediaOnly) S.els.mediaOnly.checked = !!p.media_only; S.handleSourceTypeChange(); row.querySelectorAll('.scraper-preset-chip').forEach(function (c){c.classList.remove('active');}); b.classList.add('active'); S.showToast('Preset loaded: ' + (p.label||k),'info'); }); row.appendChild(b); });
        S.savePresets(data);
    };
    S.openManagePresets = function () {
        var data = S.getPresets();
        var overlay = document.createElement('div'); overlay.className = 'scraper-preset-manage-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
        var box = document.createElement('div'); box.style.cssText = 'background:#111118;border:1px solid rgba(255,215,0,0.2);border-radius:12px;padding:20px;max-width:600px;width:100%;max-height:85vh;overflow:auto';
        var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h3 style="margin:0;color:#ffd700;font-family:Orbitron,monospace;font-size:0.95rem">Manage Presets</h3><button class="scraper-manage-close" style="background:none;border:none;color:#999;font-size:1.3rem;cursor:pointer">&times;</button></div>';
        html += '<div id="scraper-preset-list"></div>';
        html += '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:16px 0">';
        html += '<h4 style="color:#ffd700;font-size:0.8rem;margin:0 0 8px">Add / Edit Preset</h4>';
        html += '<input type="hidden" id="preset-edit-id">';
        html += '<div style="display:grid;gap:8px"><input id="preset-label" placeholder="Label (e.g. My Alpha Feed)" style="padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:#0a0a0f;color:#fff"><input id="preset-target" placeholder="Query (e.g. $SOL OR #DePIN)" style="padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:#0a0a0f;color:#fff"><div style="display:flex;gap:8px"><select id="preset-source" style="flex:1;padding:8px;border-radius:6px;background:#0a0a0f;color:#fff;border:1px solid rgba(255,255,255,0.1)"><option value="keyword">Keyword</option><option value="user">User</option><option value="hashtag">Hashtag</option><option value="cashtag">Cashtag</option><option value="url">URL</option></select><select id="preset-max" style="flex:1;padding:8px;border-radius:6px;background:#0a0a0f;color:#fff;border:1px solid rgba(255,255,255,0.1)"><option value="5">5</option><option value="10">10</option><option value="25" selected>25</option><option value="50">50</option><option value="100">100</option></select></div><label style="color:#999;font-size:0.8rem"><input type="checkbox" id="preset-media"> Media only</label><div style="display:flex;gap:8px"><button id="preset-save" style="flex:1;padding:8px;background:#ffd700;color:#000;border:none;border-radius:6px;font-weight:600;cursor:pointer">Save Preset</button><button id="preset-cancel-edit" style="padding:8px 14px;background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:6px;cursor:pointer">Clear</button></div></div>';
        box.innerHTML = html; overlay.appendChild(box); document.body.appendChild(overlay);
        function refresh() { var list = box.querySelector('#scraper-preset-list'); list.innerHTML=''; Object.keys(data).forEach(function(k){ var p=data[k]; var r=document.createElement('div'); r.style.cssText='display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:rgba(255,255,255,0.04);border-radius:6px;margin-bottom:6px'; r.innerHTML='<span style="color:#e5e5e5;font-size:0.8rem;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(p.label||k)+' — <span style="color:#999">'+(p.target||'').slice(0,40)+'</span></span><span><button data-act="edit" data-k="'+k+'" style="background:none;border:1px solid rgba(255,215,0,0.3);color:#ffd700;border-radius:4px;padding:2px 6px;font-size:0.7rem;cursor:pointer;margin-right:4px">Edit</button><button data-act="del" data-k="'+k+'" style="background:none;border:1px solid rgba(239,68,68,0.3);color:#ef4444;border-radius:4px;padding:2px 6px;font-size:0.7rem;cursor:pointer">Del</button></span>'; list.appendChild(r); }); }
        refresh();
        box.addEventListener('click', function(e){ var b=e.target.closest('[data-act]'); if(!b) return; var k=b.getAttribute('data-k'); if(b.getAttribute('data-act')==='edit'){ var p=data[k]; box.querySelector('#preset-edit-id').value=k; box.querySelector('#preset-label').value=p.label||k; box.querySelector('#preset-target').value=p.target||''; box.querySelector('#preset-source').value=p.source_type||'keyword'; box.querySelector('#preset-max').value=String(p.max_results||25); box.querySelector('#preset-media').checked=!!p.media_only; } else if(b.getAttribute('data-act')==='del'){ if(confirm('Delete preset "'+k+'"?')){ delete data[k]; S.savePresets(data); S.renderPresets(); refresh(); } } });
        box.querySelector('#preset-save').addEventListener('click', function(){ var id=box.querySelector('#preset-edit-id').value.trim()||('custom-'+Date.now()); var label=box.querySelector('#preset-label').value.trim(); var target=box.querySelector('#preset-target').value.trim(); if(!label||!target){ S.showToast('Label and query required','error'); return; } var key=label.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||id; if(data[key] && key!==box.querySelector('#preset-edit-id').value && box.querySelector('#preset-edit-id').value) key=box.querySelector('#preset-edit-id').value; data[key]={label:label,target:target,source_type:box.querySelector('#preset-source').value,max_results:parseInt(box.querySelector('#preset-max').value,10)||25,media_only:box.querySelector('#preset-media').checked}; S.savePresets(data); S.renderPresets(); box.querySelector('#preset-edit-id').value=''; box.querySelector('#preset-label').value=''; box.querySelector('#preset-target').value=''; refresh(); S.showToast('Preset saved','success'); });
        box.querySelector('#preset-cancel-edit').addEventListener('click', function(){ box.querySelector('#preset-edit-id').value=''; box.querySelector('#preset-label').value=''; box.querySelector('#preset-target').value=''; });
        function close(){ overlay.remove(); } box.querySelector('.scraper-manage-close').addEventListener('click', close); overlay.addEventListener('click', function(e){ if(e.target===overlay) close(); });
    };
    S.initPresets = function () {
        var presets = S.getPresets();
        if (S.els.presetsCount) S.els.presetsCount.textContent = Object.keys(presets).length;
        S.renderPresets();
        S.fetchPresetsFromBackend();
        var btn = document.getElementById('scraper-manage-presets-btn'); if(btn) btn.addEventListener('click', function(){ S.openManagePresets(); });
        var star = document.getElementById('scraper-presets-btn'); if(star) star.addEventListener('click', function(){ S.openManagePresets(); });
        // Step bar 2/3 → Results / My Data — directly activate panel (nav btns are hidden)
        document.querySelectorAll('.scraper-step-bar [data-nav]').forEach(function(el){
          el.addEventListener('click', function(){
            var tab = el.getAttribute('data-nav');
            var panel = document.getElementById('scraper-panel-' + tab);
            if (!panel) return;
            // activate clicked panel, deactivate others
            document.querySelectorAll('.scraper-panel.active').forEach(function(p){ p.classList.remove('active'); });
            if (panel) panel.classList.add('active');
            // update step bar visual
            S.updateStepBar(tab);
            // load content if needed
            if (tab === 'my-data') S.loadMyData(0);
          });
        });
    };

    S.scraperFetch = function (action, data, onSuccess, onError) {
        var formData = new FormData();
        formData.append('action', action);
        formData.append('_ajax_nonce', S.nonce());
        if (data) {
            Object.keys(data).forEach(function (key) {
                formData.append(key, data[key]);
            });
        }
        fetch(S.ajaxUrl(), {
            method: 'POST',
            body: formData,
            credentials: 'same-origin',
        })
            .then(function (response) { return response.json(); })
            .then(function (json) { if (onSuccess) onSuccess(json); })
            .catch(function (err) { if (onError) onError(err); });
    };

    S.debug = function (msg) {
        var box = document.getElementById('scraper-debug-box');
        if (!box) return;
        box.style.display = 'block';
        var line = document.createElement('div');
        line.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
        box.appendChild(line);
        box.scrollTop = box.scrollHeight;
    };

    window.GuilderaScraper = S;
    window.GuilderaScraper.closeLightbox = S.closeLightbox;

    document.addEventListener('DOMContentLoaded', S.init);
})();
