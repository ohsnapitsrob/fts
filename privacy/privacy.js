(function () {
  const emailLink = document.getElementById("privacyContactEmail");
  const email = window.FTS?.SiteContent?.contactEmail || "";
  const settingsButton = document.getElementById("openPrivacySettings");

  if (emailLink && email) {
    emailLink.href = `mailto:${email}`;
    emailLink.textContent = email;
  }

  settingsButton?.addEventListener("click", () => {
    window.FTS?.Privacy?.openSettings?.({
      saveLabel: "Save settings"
    });
  });
})();
