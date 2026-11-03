;(function () {
  var loaderMarkup = [
    '<div class="spin-wrapper"><div class="circle"></div><div class="circle"></div></div>',
    '<div class="spin-wrapper"><div class="circle"></div><div class="circle"></div></div>',
    '<div class="spin-wrapper"><div class="circle"></div><div class="circle"></div></div>',
    '<div class="spin-wrapper"><div class="circle"></div><div class="circle"></div></div>',
    '<div class="spin-wrapper"><div class="circle"></div><div class="circle"></div></div>',
    '<div class="spin-wrapper"><div class="circle"></div><div class="circle"></div></div>',
  ].join("");

  function ensureLoader() {
    var loader = document.getElementById("loading-wrapper");
    if (!loader && document.body) {
      loader = document.createElement("div");
      loader.id = "loading-wrapper";
      loader.innerHTML = loaderMarkup;
      document.body.insertBefore(loader, document.body.firstChild);
    }
    return loader;
  }

  function showLoader() {
    var loader = ensureLoader();
    if (!loader) return;
    loader.style.display = "flex";
    loader.style.opacity = "1";
    loader.style.visibility = "visible";
  }

  function hideLoader() {
    var loader = document.getElementById("loading-wrapper");
    if (!loader) return;
    if (window.jQuery) {
      window.jQuery(loader).fadeOut(350);
      return;
    }
    loader.style.opacity = "0";
    loader.style.visibility = "hidden";
    window.setTimeout(function () {
      loader.style.display = "none";
    }, 350);
  }

  function shouldShowForLink(link) {
    if (!link || link.dataset.noLoader === "true" || link.hasAttribute("download")) return false;
    if (link.target && link.target !== "_self") return false;
    if (link.hasAttribute("data-bs-toggle") || link.hasAttribute("data-toggle")) return false;
    var href = link.getAttribute("href") || "";
    if (!href || href === "#!" || href.charAt(0) === "#") return false;
    if (/^(javascript:|mailto:|tel:)/i.test(href)) return false;
    try {
      var url = new URL(href, window.location.href);
      return url.origin === window.location.origin && url.href !== window.location.href;
    } catch (error) {
      return false;
    }
  }

  function shouldShowForForm(form) {
    if (!form || form.dataset.noLoader === "true") return false;
    return !form.target || form.target === "_self";
  }

  window.cncPageLoader = { show: showLoader, hide: hideLoader };
  if (document.body) ensureLoader();

  window.addEventListener("load", function () {
    window.setTimeout(hideLoader, 120);
  });

  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest("a[href]");
    if (shouldShowForLink(link)) showLoader();
  });

  document.addEventListener("submit", function (event) {
    if (shouldShowForForm(event.target)) showLoader();
  });

  window.addEventListener("pageshow", function () {
    hideLoader();
  });
})();

$.sidebarMenu = function (menu) {
  var animationSpeed = 300;

  $(menu).on("click", "li a", function (e) {
    var $this = $(this);
    var checkElement = $this.next();

    if (checkElement.is(".treeview-menu") && checkElement.is(":visible")) {
      checkElement.slideUp(animationSpeed, function () {
        checkElement.removeClass("menu-open");
      });
      checkElement.parent("li").removeClass("active");
    }

    //If the menu is not visible
    else if (
      checkElement.is(".treeview-menu") &&
      !checkElement.is(":visible")
    ) {
      //Get the parent menu
      var parent = $this.parents("ul").first();
      //Close all open menus within the parent
      var ul = parent.find("ul:visible").slideUp(animationSpeed);
      //Remove the menu-open class from the parent
      ul.removeClass("menu-open");
      //Get the parent li
      var parent_li = $this.parent("li");

      //Open the target menu and add the menu-open class
      checkElement.slideDown(animationSpeed, function () {
        //Add the class active to the parent li
        checkElement.addClass("menu-open");
        parent.find("li.active").removeClass("active");
        parent_li.addClass("active");
      });
    }
    //if this isn't a link, prevent the page from being redirected
    if (checkElement.is(".treeview-menu")) {
      e.preventDefault();
    }
  });
};
$.sidebarMenu($(".sidebar-menu"));

// Custom Sidebar JS
jQuery(function ($) {
  //toggle sidebar
  $(document).off("click.cncSidebarToggle").on("click.cncSidebarToggle", ".toggle-sidebar, #toggle-sidebar", function (event) {
    event.preventDefault();
    $(".page-wrapper").toggleClass("toggled");
  });

  // Pin sidebar on click
  $(".pin-sidebar").on("click", function () {
    if ($(".page-wrapper").hasClass("pinned")) {
      // unpin sidebar when hovered
      $(".page-wrapper").removeClass("pinned");
      $("#sidebar").unbind("hover");
    } else {
      $(".page-wrapper").addClass("pinned");
      $("#sidebar").on("mouseenter", function () {
        $(".page-wrapper").addClass("sidebar-hovered");
      });

      $("#sidebar").on("mouseleave", function () {
        $(".page-wrapper").removeClass("sidebar-hovered");
      });
    }
  });

  // Pinned sidebar
  $(function () {
    $(".page-wrapper").hasClass("pinned");
    $("#sidebar").on("mouseenter", function () {
      $(".page-wrapper").addClass("sidebar-hovered");
    }).on("mouseleave", function () {
      $(".page-wrapper").removeClass("sidebar-hovered");
    });
  });

  // Toggle sidebar overlay
  $("#overlay").on("click", function () {
    $(".page-wrapper").toggleClass("toggled");
  });

  // Added by Srinu
  $(function () {
    // When the window is resized,
    $(window).resize(function () {
      // When the width and height meet your specific requirements or lower
      if ($(window).width() <= 768) {
        $(".page-wrapper").removeClass("pinned");
      }
    });
    // When the window is resized,
    $(window).resize(function () {
      // When the width and height meet your specific requirements or lower
      if ($(window).width() >= 768) {
        $(".page-wrapper").removeClass("toggled");
      }
    });
  });
});

// Loading
$(function () {
  $("#loading-wrapper").fadeOut(350);
});

$(function () {
  $(".day-sorting .btn").on("click", function () {
    $(".day-sorting .btn").removeClass("btn-primary");
    $(this).addClass("btn-primary");
  });
});

// Current Month
$(document).ready(function () {
  var monthNames = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December"
  ];
  var currentMonth = new Date().getMonth(); // 0-11 index
  $(".monthDisplay").text('In ' + monthNames[currentMonth]);
});

// Week Days Btn Select
$(document).ready(function () {
  $('.week-days a').click(function () {
    // Remove primary class from all links and add secondary
    $('.week-days a').removeClass('bg-primary text-white').addClass('bg-secondary-subtle');
    // Add primary class to the clicked link and remove secondary
    $(this).addClass('bg-primary text-white').removeClass('bg-secondary-subtle');
  });
});

// Week Days Btn Group
$(document).ready(function () {
  $('.week-days-btn-group .btn').click(function () {
    // Remove primary class from all links and add light
    $('.week-days-btn-group .btn').removeClass('btn-primary').addClass('btn-light');
    // Add primary class to the clicked link and remove light
    $(this).addClass('btn-primary').removeClass('btn-light');
  });
});


/***********
***********
***********
  Bootstrap JS 
***********
***********
***********/

// Tooltip
var tooltipTriggerList = [].slice.call(
  document.querySelectorAll('[data-bs-toggle="tooltip"]')
);
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl);
});

// Popover
var popoverTriggerList = [].slice.call(
  document.querySelectorAll('[data-bs-toggle="popover"]')
);
var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
  return new bootstrap.Popover(popoverTriggerEl);
});

(function () {
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;",
      }[char];
    });
  }

  function relativeTime(value) {
    if (!value) return "";
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("es-GT", { dateStyle: "short", timeStyle: "short" });
  }

  function setupAuthLoaders() {
    document.querySelectorAll(".auth-wrapper form").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        var button = form.querySelector('button[type="submit"]');
        if (!button) return;
        if (form.dataset.cncSubmitting === "1") {
          event.preventDefault();
          return;
        }
        form.dataset.cncSubmitting = "1";
        button.dataset.originalText = button.innerHTML;
        button.setAttribute("aria-disabled", "true");
        button.classList.add("disabled");
        button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Procesando';
        window.setTimeout(function () {
          if (!document.body.contains(form)) return;
          form.dataset.cncSubmitting = "";
          button.removeAttribute("aria-disabled");
          button.classList.remove("disabled");
          button.innerHTML = button.dataset.originalText || "Iniciar sesion";
        }, 12000);
      });
    });
  }

  function isAdminArea() {
    return window.location.pathname === "/admin" || window.location.pathname.indexOf("/admin/") === 0 || window.location.pathname.indexOf("/configuracion") === 0;
  }

  function isAuthPage() {
    return window.location.pathname.indexOf("/admin/login") === 0 || window.location.pathname.indexOf("/signup") === 0;
  }

  function currentReturnTo() {
    if (!isAdminArea() || isAuthPage()) return "/admin/dash";
    return window.location.pathname + window.location.search + window.location.hash;
  }

  function redirectToLogin(expired, returnTo) {
    if (window.__cncRedirectingToLogin || isAuthPage()) return;
    window.__cncRedirectingToLogin = true;
    if (window.cncPageLoader) window.cncPageLoader.show();
    var params = new URLSearchParams();
    if (expired) params.set("expired", "1");
    params.set("returnTo", returnTo || currentReturnTo());
    window.location.href = "/admin/login?" + params.toString();
  }

  function handleSessionResponse(response, payload) {
    if (!response || response.status !== 401 || !isAdminArea() || isAuthPage()) return;
    var data = payload || {};
    redirectToLogin(data.expired !== false, data.returnTo || currentReturnTo());
  }

  function setupSessionFetchGuard() {
    if (!window.fetch || window.__cncSessionFetchGuard) return;
    window.__cncSessionFetchGuard = true;
    var nativeFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      var options = Object.assign({}, init || {});
      var headers = new Headers(options.headers || (input && input.headers) || {});
      if (isAdminArea() && !headers.has("X-Current-Url")) {
        headers.set("X-Current-Url", currentReturnTo());
      }
      options.headers = headers;
      return nativeFetch(input, options).then(function (response) {
        if (response.status === 401 && isAdminArea() && !isAuthPage()) {
          response.clone().json()
            .then(function (data) { handleSessionResponse(response, data); })
            .catch(function () { handleSessionResponse(response, {}); });
        }
        return response;
      });
    };
  }

  async function requestJson(url, options) {
    var requestOptions = Object.assign({}, options || {});
    var headers = new Headers(requestOptions.headers || {});
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    requestOptions.headers = headers;
    var response = await fetch(url, requestOptions);
    var data = await response.json().catch(function () { return {}; });
    if (response.status === 401) handleSessionResponse(response, data);
    if (!response.ok) throw new Error(data.error || data.message || "No se pudo completar la operación.");
    return data;
  }

  function ensureNotificationDropdown() {
    var header = document.querySelector(".app-header");
    var actions = header && header.querySelector(".header-actions");
    if (!actions) return null;

    actions.querySelectorAll(".dropdown").forEach(function (dropdown) {
      if (dropdown.querySelector(".ri-alarm-warning-line, .ri-message-3-line")) {
        dropdown.classList.add("d-none");
      }
    });

    var notificationIcon = actions.querySelector(".ri-notification-3-line, .ri-notification-badge-line");
    var dropdown = notificationIcon && notificationIcon.closest(".dropdown");
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.className = "dropdown";
      dropdown.innerHTML = [
        '<a class="dropdown-toggle header-icon cnc-notification-toggle" href="#!" role="button" data-bs-toggle="dropdown" aria-expanded="false">',
        '<i class="ri-notification-3-line"></i><span class="count-label cnc-notification-count d-none"></span>',
        "</a>",
        '<div class="dropdown-menu dropdown-menu-end dropdown-300 cnc-notification-menu"></div>',
      ].join("");
      var userDropdown = actions.querySelector("#userSettings") && actions.querySelector("#userSettings").closest(".dropdown");
      actions.insertBefore(dropdown, userDropdown || actions.firstChild);
    }

    var toggle = dropdown.querySelector(".dropdown-toggle");
    if (toggle) {
      toggle.classList.add("cnc-notification-toggle", "header-icon");
      toggle.setAttribute("data-bs-toggle", "dropdown");
      if (!toggle.querySelector(".count-label")) {
        toggle.insertAdjacentHTML("beforeend", '<span class="count-label cnc-notification-count d-none"></span>');
      }
    }

    var menu = dropdown.querySelector(".dropdown-menu");
    if (!menu) {
      menu = document.createElement("div");
      menu.className = "dropdown-menu dropdown-menu-end dropdown-300";
      dropdown.appendChild(menu);
    }
    menu.classList.add("cnc-notification-menu");
    menu.innerHTML = [
      '<div class="cnc-notification-head">',
      "<h5>Notificaciones</h5>",
      '<button type="button" class="btn btn-sm btn-light" data-notification-clear>Limpiar</button>',
      "</div>",
      '<div class="cnc-notification-list"><p class="text-muted small mb-0 p-3">Cargando notificaciones...</p></div>',
    ].join("");
    return dropdown;
  }

  function notificationIcon(tipo) {
    var map = {
      cita: "ri-calendar-check-line",
      consulta: "ri-stethoscope-line",
      cotizacion: "ri-file-list-3-line",
      pago: "ri-money-dollar-circle-line",
      pago_pendiente: "ri-bill-line",
      stock_bajo: "ri-error-warning-line",
      producto_agotado: "ri-close-circle-line",
      solicitud: "ri-user-add-line",
      usuario: "ri-user-settings-line",
    };
    return map[tipo] || "ri-notification-3-line";
  }

  function renderNotifications(dropdown, payload) {
    var list = dropdown.querySelector(".cnc-notification-list");
    var counter = dropdown.querySelector(".count-label");
    var items = Array.isArray(payload.items) ? payload.items : [];
    var unread = Number(payload.unread || 0);

    if (counter) {
      counter.classList.toggle("d-none", unread <= 0);
      counter.textContent = unread > 99 ? "99+" : String(unread);
    }

    if (!list) return;
    if (!items.length) {
      list.innerHTML = '<p class="text-muted small mb-0 p-3">No hay alertas pendientes.</p>';
      return;
    }

    list.innerHTML = items.map(function (item) {
      var read = Number(item.leida || 0) === 1;
      return [
        '<button type="button" class="cnc-notification-item ' + (read ? "" : "is-unread") + '" data-notification-id="' + escapeHtml(item.idnotificacion) + '" data-notification-url="' + escapeHtml(item.url || "") + '">',
        '<span class="cnc-notification-icon"><i class="' + notificationIcon(item.tipo) + '"></i></span>',
        '<span class="cnc-notification-copy">',
        "<strong>" + escapeHtml(item.titulo || "Notificación") + "</strong>",
        "<small>" + escapeHtml(item.mensaje || "") + "</small>",
        '<em>' + escapeHtml(relativeTime(item.creada_en)) + "</em>",
        "</span>",
        "</button>",
      ].join("");
    }).join("");
  }

  function setupNotifications() {
    if (!window.fetch || !document.querySelector(".app-header")) return;
    var dropdown = ensureNotificationDropdown();
    if (!dropdown) return;

    var loading = false;
    async function refresh() {
      if (loading) return;
      loading = true;
      try {
        var payload = await requestJson("/api/admin/notificaciones?limit=8", {
          headers: { "X-CNC-Passive": "1" },
          cache: "no-store",
        });
        renderNotifications(dropdown, payload);
      } catch (error) {
        renderNotifications(dropdown, { items: [], unread: 0 });
      } finally {
        loading = false;
      }
    }

    dropdown.addEventListener("show.bs.dropdown", refresh);
    dropdown.addEventListener("click", async function (event) {
      var clear = event.target.closest("[data-notification-clear]");
      if (clear) {
        event.preventDefault();
        clear.disabled = true;
        try {
          await requestJson("/api/admin/notificaciones/marcar-leidas", { method: "POST" });
          await refresh();
        } finally {
          clear.disabled = false;
        }
        return;
      }

      var item = event.target.closest("[data-notification-id]");
      if (!item) return;
      var id = item.dataset.notificationId;
      var url = item.dataset.notificationUrl;
      try {
        await requestJson("/api/admin/notificaciones/" + encodeURIComponent(id) + "/leida", { method: "POST" });
      } catch (error) {
      }
      if (url) window.location.href = url;
      else refresh();
    });

    refresh();
    window.setInterval(refresh, 30000);
  }

  function setupHeaderSearch() {
    document.querySelectorAll(".search-container input").forEach(function (input) {
      input.addEventListener("keydown", function (event) {
        if (event.key !== "Enter") return;
        var value = input.value.trim();
        if (!value) return;
        window.location.href = "/admin/pacientes?search=" + encodeURIComponent(value);
      });
    });
  }

  function setupSessionWatcher() {
    if (!window.fetch || !isAdminArea() || isAuthPage()) return;

    async function checkSession() {
      try {
        var response = await fetch("/api/admin/session/status", {
          headers: {
            Accept: "application/json",
            "X-CNC-Passive": "1",
            "X-Current-Url": currentReturnTo(),
          },
          cache: "no-store",
        });
        var data = await response.json().catch(function () { return {}; });
        if (response.status === 401) handleSessionResponse(response, data);
      } catch (error) {
      }
    }

    window.setInterval(checkSession, 30000);
  }

  function ensureAdminMobileStyles() {
    if (document.getElementById("cnc-admin-mobile-shell-style")) return;

    var style = document.createElement("style");
    style.id = "cnc-admin-mobile-shell-style";
    style.textContent = [
      "@media (max-width:767.98px){",
      "html,body{max-width:100%;overflow-x:hidden}",
      ".page-wrapper,.main-container,.app-container{max-width:100vw;overflow-x:hidden}",
      ".app-header{align-items:center!important;display:flex!important;flex-wrap:nowrap!important;gap:.65rem;justify-content:space-between;min-height:72px;padding:.65rem 1rem;width:100%}",
      ".app-header .brand-container-sm{align-items:center;display:flex!important;flex:0 0 auto;gap:.55rem;min-width:0;order:1}",
      ".app-header .brand-container-sm .app-brand{min-width:0;width:auto}",
      ".app-header .brand-container-sm .app-brand .logo{height:48px;max-width:56px;object-fit:contain;width:56px}",
      ".app-header>.d-flex:not(.brand-container-sm){align-items:center;display:flex!important;flex:0 0 auto;gap:.55rem;order:1}",
      ".app-header .toggle-sidebar,.app-header #toggle-sidebar{align-items:center;background:#fff;border:0;border-radius:8px;color:#7367f0;display:inline-flex;height:38px;justify-content:center;margin:0!important;padding:0;width:38px}",
      ".app-header .toggle-sidebar i,.app-header #toggle-sidebar i{font-size:1.25rem;line-height:1}",
      ".app-header .search-container{display:none!important}",
      ".app-header .header-actions{align-items:center;display:flex!important;flex:0 0 auto!important;flex-wrap:nowrap!important;gap:.45rem;justify-content:flex-end;margin-left:auto!important;min-width:auto!important;order:2}",
      ".app-header .header-actions>.d-lg-flex,.app-header .header-actions>.dropdown:has(.ri-star-line),.app-header .header-actions>.dropdown:has(.ri-message-3-line),.app-header .header-actions>.dropdown:has(.ri-alarm-warning-line){display:none!important}",
      ".app-header .header-actions .header-icon{height:36px;width:36px}",
      ".app-header .avatar-box img,.app-header .avatar-box .profile-initials-badge,.app-header .header-photo,.app-header .header-initials{height:42px!important;width:42px!important}",
      ".app-hero-header{padding:.75rem 1rem;position:relative;top:auto}",
      ".app-body{padding:1rem}",
      "}",
      "@media (max-width:575.98px){",
      ".app-header{min-height:70px;padding:.6rem .9rem}",
      ".app-header .brand-container-sm .app-brand .logo{height:44px;max-width:50px;width:50px}",
      ".app-header .toggle-sidebar,.app-header #toggle-sidebar{height:36px;width:36px}",
      "}",
    ].join("");
    document.head.appendChild(style);
  }

  function normalizeSidebarToggle(button) {
    if (!button) return;
    button.id = "toggle-sidebar";
    button.type = "button";
    button.classList.add("toggle-sidebar");
    button.classList.remove("btn", "btn-outline-primary", "me-2");
    button.setAttribute("aria-label", "Abrir menu");
    if (!button.querySelector("i")) {
      button.innerHTML = '<i class="ri-menu-line"></i>';
    }
  }

  function setupMobileBrand() {
    var header = document.querySelector(".app-header");
    if (!header) return;
    var brand = header.querySelector(".brand-container-sm");
    var existingToggle = header.querySelector(".toggle-sidebar, #toggle-sidebar");

    if (!brand) {
      header.insertAdjacentHTML("afterbegin", [
        '<div class="brand-container-sm d-xl-none d-flex align-items-center">',
        '<div class="app-brand"><a href="/admin/dash"><img src="/images/cnc-logo-alt.svg" class="logo" alt="C&C Dental Studio"></a></div>',
        existingToggle ? "" : '<button type="button" class="toggle-sidebar" aria-label="Abrir menu"><i class="ri-menu-line"></i></button>',
        "</div>",
      ].join(""));
      brand = header.querySelector(".brand-container-sm");
    }

    var brandToggle = brand.querySelector(".toggle-sidebar, #toggle-sidebar");
    var toggles = Array.prototype.slice.call(header.querySelectorAll(".toggle-sidebar, #toggle-sidebar"));
    if (!brandToggle && !toggles.length) {
      brand.insertAdjacentHTML("beforeend", '<button type="button" class="toggle-sidebar" aria-label="Abrir menu"><i class="ri-menu-line"></i></button>');
      toggles = Array.prototype.slice.call(header.querySelectorAll(".toggle-sidebar, #toggle-sidebar"));
      brandToggle = brand.querySelector(".toggle-sidebar, #toggle-sidebar");
    }

    toggles.forEach(normalizeSidebarToggle);
    if (brandToggle) {
      toggles.forEach(function (button) {
        if (button !== brandToggle) button.remove();
      });
    } else if (toggles.length > 1) {
      toggles.slice(1).forEach(function (button) { button.remove(); });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    ensureAdminMobileStyles();
    setupSessionFetchGuard();
    setupMobileBrand();
    setupAuthLoaders();
    setupNotifications();
    setupHeaderSearch();
    setupSessionWatcher();
  });
})();
