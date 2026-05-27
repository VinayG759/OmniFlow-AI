/* OmniFlow AI — embeddable chat widget v1.0
   Paste the <script> tag before </body> on your website.
   The iframe loads the /widget page from your OmniFlow instance. */
(function () {
  "use strict";

  var script =
    document.currentScript ||
    (function () {
      var tags = document.getElementsByTagName("script");
      return tags[tags.length - 1];
    })();

  /* Derive the OmniFlow origin from this script's src URL */
  var src    = script.src || "";
  var origin = src.substring(0, src.lastIndexOf("/"));
  if (!origin) origin = window.location.origin; /* fallback for same-origin loads */

  var greeting = script.getAttribute("data-greeting") ||
    "Hi! 👋 I’m OmniFlow AI. How can I help you today?";
  var color = script.getAttribute("data-color") || "#22d3ee";

  var params = new URLSearchParams({ greeting: greeting, color: color });
  var iframeSrc = origin + "/widget?" + params.toString();

  var iframe = document.createElement("iframe");
  iframe.src = iframeSrc;
  iframe.title = "OmniFlow AI Chat";
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("scrolling", "no");
  iframe.style.cssText = [
    "position:fixed",
    "bottom:0",
    "right:0",
    "width:400px",
    "height:640px",
    "border:none",
    "z-index:2147483647",
    "background:transparent",
    "pointer-events:auto",
  ].join(";");

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  onReady(function () {
    document.body.appendChild(iframe);
  });
})();
