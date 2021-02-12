function error(text) {
  document.querySelector(".error").style.display = "inherit";
  document.querySelector("#errortext").innerText = `Error: ${text}`;
}

// Run when the <body> loads
async function main() {
  if (window.location.hash) {
    // Fail if the b64 library or API was not loaded
    if (!("b64" in window)) {
      error("Base64 library tidak di'load'.");
      return;
    }
    if (!("apiVersions" in window)) {
      error("API library tidak di'load'.");
      return;
    }

    // Try to get page data from the URL if possible
    const hash = window.location.hash.slice(1);
    let params;
    try {
      params = JSON.parse(b64.decode(hash));
    } catch {
      error("Terdapat kesilapan pada pautan yang diberi.");
      return;
    }

    // Check that all required parameters encoded in the URL are present
    if (!("v" in params && "e" in params)) {
      error("Pautan yang diberikan tidak sah. URL yang dikod tidak mengandungi parameter yang diperlukan.");
      return;
    }

    // Check that the version in the parameters is valid
    if (!(params["v"] in apiVersions)) {
      error("Versi API tidak disokong. Pautan mungkin tidak sah.");
      return;
    }

    const api = apiVersions[params["v"]];

    // Get values for decryption
    const encrypted = b64.base64ToBinary(params["e"]);
    const salt = "s" in params ? b64.base64ToBinary(params["s"]) : null;
    const iv = "i" in params ? b64.base64ToBinary(params["i"]) : null;

    let hint, password;
    if ("h" in params) {
      hint = params["h"];
      password = prompt(`Masukkan kata laluan untuk membukan pautan.\n\nHint: ${hint}`);
    } else {
      password = prompt("Masukkan kata laluan untuk membukan pautan.");
    }

    // Decrypt and redirect if possible
    let url;
    try {
      url = await api.decrypt(encrypted, password, salt, iv);
    } catch {
      // Password is incorrect.
      error("Kata laluan salah.");

      // Set the "decrypt without redirect" URL appropriately
      document.querySelector("#no-redirect").href =
        `https://ezicodr.github.io/link-lock/decrypt/#${hash}`;

      // Set the "create hidden bookmark" URL appropriately
      document.querySelector("#hidden").href =
        `https://ezicodr.github.io/link-lock/hidden/#${hash}`;
      return;
    }

    try {
      // Extra check to make sure the URL is valid. Probably shouldn't fail.
      let urlObj = new URL(url);

      // Prevent XSS by making sure only HTTP URLs are used. Also allow magnet
      // links for password-protected torrents.
      if (!(urlObj.protocol == "http:"
            || urlObj.protocol == "https:"
            || urlObj.protocol == "magnet:")) {
        error(`Pautan menggunakan protokol selain hiperteks yang tidak sah. `
            + `URL bermula dengan "${urlObj.protocol}" dan mungkin berbahaya.`);
        return;
      }

      // IMPORTANT NOTE: must use window.location.href instead of the (in my
      // opinion more proper) window.location.replace. If you use replace, it
      // causes Chrome to change the icon of a bookmarked link to update it to
      // the unlocked destination. This is dangerous information leakage.
      window.location.href = url;
    } catch {
      error("URL tidak sah telah disulitkan. Gagal untuk dilencongkan (redirect).");
      console.log(url);
      return;
    }
  } else {
    // Otherwise redirect to the creator
    window.location.replace("./create");
  }
}
