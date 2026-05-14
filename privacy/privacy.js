(function () {
  const emailLink = document.getElementById("privacyContactEmail");
  const email = window.FTS?.SiteContent?.contactEmail || "";

  if (emailLink && email) {
    emailLink.href = `mailto:${email}`;
    emailLink.textContent = email;
  }
})();
