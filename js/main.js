(function () {
  "use strict";
  var cfg = window.UBOMI_CONFIG || {};

  /* ---- fill contact details from config ---- */
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }
  each("[data-cfg]", function (el) {
    var v = cfg[el.getAttribute("data-cfg")];
    if (v) el.textContent = v;
  });
  each("[data-href]", function (el) {
    var kind = el.getAttribute("data-href");
    var href = "";
    if (kind === "tel") href = "tel:" + String(cfg.phoneDisplay || "").replace(/[^\d+]/g, "");
    if (kind === "whatsapp") href = "https://wa.me/" + (cfg.whatsapp || "");
    if (kind === "mail") href = "mailto:" + (cfg.email || "");
    if (kind === "instagram") href = cfg.instagramUrl || "#";
    if (kind === "map") href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent((cfg.mapQuery || "") + " " + (cfg.address || ""));
    if (href) el.setAttribute("href", href);
  });
  var mapBox = document.getElementById("map-embed");
  if (mapBox && cfg.mapEmbedUrl) {
    var f = document.createElement("iframe");
    f.src = cfg.mapEmbedUrl; f.title = "Map showing the uBöMi location"; f.loading = "lazy";
    f.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    mapBox.insertBefore(f, mapBox.firstChild);
    mapBox.classList.add("has-embed");
  }

  /* ---- mobile nav ---- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { nav.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); }
    });
  }

  /* ---- remember which treatment was tapped (per-visit convenience only) ---- */
  each("[data-treatment]", function (a) {
    a.addEventListener("click", function () {
      try { sessionStorage.setItem("ubomi-treatment", a.getAttribute("data-treatment")); } catch (e) {}
    });
  });

  /* ---- menu tabs ---- */
  var tabs = document.querySelectorAll(".tabs a");
  var panels = document.querySelectorAll(".panel");
  if (tabs.length && panels.length) {
    var show = function () {
      var id = (location.hash || "").replace("#", "") || panels[0].id;
      var found = false;
      Array.prototype.forEach.call(panels, function (p) { if (p.id === id) found = true; });
      if (!found) id = panels[0].id;
      Array.prototype.forEach.call(panels, function (p) { p.hidden = p.id !== id; });
      Array.prototype.forEach.call(tabs, function (t) {
        t.setAttribute("aria-current", t.getAttribute("href") === "#" + id ? "true" : "false");
      });
    };
    window.addEventListener("hashchange", show);
    show();
  }

  /* ---- enquiry forms ---- */
  function buildMessage(form) {
    var lines = [];
    var g = function (n) { var el = form.elements[n]; return el ? String(el.value || "").trim() : ""; };
    var type = form.elements.type ? (form.querySelector('input[name="type"]:checked') || {}).value : "";
    lines.push(form.getAttribute("data-subject") || "Enquiry");
    if (type) lines.push("Booking for: " + (type === "spa" ? "Day spa treatment" : "Tapas bar table"));
    var map = [["service", "Service"], ["date", "Preferred date"], ["time", "Preferred time"], ["guests", "Guests"],
               ["name", "Name"], ["phone", "Phone"], ["email", "Email"], ["notes", "Notes"]];
    map.forEach(function (m) { var v = g(m[0]); if (v) lines.push(m[1] + ": " + v); });
    return lines.join("\n");
  }
  function clearErrors(form) { each(".err", function (e) { if (form.contains(e)) e.textContent = ""; }); }
  function validate(form) {
    clearErrors(form);
    var ok = true, first = null;
    Array.prototype.forEach.call(form.querySelectorAll("[required]"), function (el) {
      if (el.closest("[hidden]")) return;
      var msg = "";
      if (!String(el.value || "").trim()) msg = "Please fill in this field.";
      else if (el.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value)) msg = "Enter an email address like name@example.com.";
      if (msg) {
        ok = false; if (!first) first = el;
        var err = document.getElementById(el.id + "-err"); if (err) err.textContent = msg;
        el.setAttribute("aria-invalid", "true");
      } else el.removeAttribute("aria-invalid");
    });
    if (first) first.focus();
    return ok;
  }

  var bookForm = document.getElementById("booking-form");
  if (bookForm) {
    var svc = document.getElementById("service");
    var groupsSpa = document.getElementById("opts-spa");
    var groupsTapas = document.getElementById("opts-tapas");
    var guestsField = document.getElementById("guests-field");
    var applyType = function (t) {
      var radio = bookForm.querySelector('input[name="type"][value="' + t + '"]');
      if (radio) radio.checked = true;
      var spa = t === "spa";
      svc.innerHTML = "";
      var ph = document.createElement("option"); ph.value = ""; ph.textContent = spa ? "Choose a treatment" : "Choose a menu"; svc.appendChild(ph);
      var src = spa ? groupsSpa : groupsTapas;
      Array.prototype.forEach.call(src.querySelectorAll("optgroup, option"), function (n) { svc.appendChild(n.cloneNode(true)); });
      guestsField.querySelector("label").textContent = spa ? "Number of people" : "Number of guests";
      var remembered = "";
      try { remembered = sessionStorage.getItem("ubomi-treatment") || ""; } catch (e) {}
      if (spa && remembered) { svc.value = remembered; }
    };
    var current = (location.hash === "#tapas") ? "tapas" : "spa";
    applyType(current);
    Array.prototype.forEach.call(bookForm.querySelectorAll('input[name="type"]'), function (r) {
      r.addEventListener("change", function () { applyType(r.value); });
    });
    window.addEventListener("hashchange", function () {
      if (location.hash === "#tapas" || location.hash === "#spa") applyType(location.hash.slice(1));
    });
  }

  each("form[data-enquiry]", function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate(form)) return;
      var msg = buildMessage(form);
      var box = form.querySelector(".result");
      var show = function (html, text) {
        box.hidden = false; box.innerHTML = "";
        var p = document.createElement("p"); p.innerHTML = html; box.appendChild(p);
        if (text) { var pre = document.createElement("pre"); pre.textContent = text; box.appendChild(pre); }
        box.setAttribute("tabindex", "-1"); box.focus();
        return box;
      };
      if (cfg.formEndpoint) {
        var data = {}; Array.prototype.forEach.call(form.elements, function (el) { if (el.name && el.type !== "radio") data[el.name] = el.value; });
        data.message = msg;
        fetch(cfg.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) })
          .then(function (r) { if (!r.ok) throw new Error("bad"); show("<strong>Thank you. Your enquiry has been sent.</strong> We will reply within one working day."); form.reset(); })
          .catch(function () { show("<strong>Your enquiry could not be sent.</strong> Please send it on WhatsApp or email instead.", msg); addLinks(box, msg); });
        return;
      }
      show("<strong>Your enquiry is ready.</strong> Choose how to send it. Nothing is sent until you tap one of these.", msg);
      addLinks(box, msg);
    });
  });
  function addLinks(box, msg) {
    var row = document.createElement("div"); row.className = "actions";
    var wa = document.createElement("a"); wa.className = "btn"; wa.target = "_blank"; wa.rel = "noopener";
    wa.href = "https://wa.me/" + (cfg.whatsapp || "") + "?text=" + encodeURIComponent(msg); wa.textContent = "Send on WhatsApp";
    var em = document.createElement("a"); em.className = "btn btn--ghost";
    em.href = "mailto:" + (cfg.email || "") + "?subject=" + encodeURIComponent(msg.split("\n")[0]) + "&body=" + encodeURIComponent(msg); em.textContent = "Send by email";
    row.appendChild(wa); row.appendChild(em); box.appendChild(row);
  }
})();
