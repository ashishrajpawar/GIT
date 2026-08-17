/* Wrong-answer cases for 02/0011-images-imagepicker.
 *
 *   node scripts/verify-lesson.mjs modules/02-react-native/0011-images-imagepicker.html \
 *        --wrong scripts/cases/0011-images-imagepicker.mjs
 *
 * `alternatives` are other correct styles — all must PASS.
 * `mistakes` must each FAIL, and `expect` names the check it should trip.
 *
 * The mistake the lesson exists for spreads the asset and deletes `exif`. It
 * strips today's metadata field and nothing else, so it passes every test
 * written against today's picker. The photo still shows a gate; the payload
 * still shows an address the moment the library adds `location` alongside it.
 */

export const alternatives = {
  "guard clauses and a helper for the filename": `function baseName(raw) {
  const last = String(raw ?? "").split(/[\\\\/]/).pop().trim();
  return last === "" ? "photo.jpg" : last;
}

function prepareAttachment(asset, limits) {
  if (!limits.allowedTypes.includes(asset.mimeType)) return { ok: false, reason: "type" };
  if (asset.fileSize > limits.maxBytes) return { ok: false, reason: "size" };

  return {
    ok: true,
    upload: { uri: asset.uri, mimeType: asset.mimeType, fileName: baseName(asset.fileName) },
  };
}`,

  "destructures the fields it wants up front": `function prepareAttachment({ uri, mimeType, fileSize, fileName }, { maxBytes, allowedTypes }) {
  if (allowedTypes.indexOf(mimeType) === -1) return { ok: false, reason: "type" };
  if (fileSize > maxBytes) return { ok: false, reason: "size" };

  const parts = String(fileName == null ? "" : fileName).split("/");
  const withoutSlash = parts[parts.length - 1];
  const back = withoutSlash.split("\\\\");
  const name = back[back.length - 1].trim();

  return { ok: true, upload: { uri, mimeType, fileName: name || "photo.jpg" } };
}`,

  "collects the reason first, then builds": `function prepareAttachment(asset, limits) {
  let reason = null;
  if (!limits.allowedTypes.includes(asset.mimeType)) reason = "type";
  else if (asset.fileSize > limits.maxBytes) reason = "size";
  if (reason) return { ok: false, reason };

  const segments = String(asset.fileName ?? "").split(/[\\\\/]/);
  const last = segments.filter((s) => s.trim() !== "").pop();

  return {
    ok: true,
    upload: {
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileName: last === undefined ? "photo.jpg" : last.trim(),
    },
  };
}`,
};

export const mistakes = {
  "spreads the asset and deletes exif": {
    expect: "a field the picker adds later is not carried along",
    impl: `function prepareAttachment(asset, limits) {
  if (!limits.allowedTypes.includes(asset.mimeType)) return { ok: false, reason: "type" };
  if (asset.fileSize > limits.maxBytes) return { ok: false, reason: "size" };

  const upload = { ...asset };
  delete upload.exif;                      // today's metadata field, and only today's
  delete upload.fileSize;
  delete upload.width;
  delete upload.height;
  upload.fileName = String(asset.fileName ?? "").split(/[\\\\/]/).pop() || "photo.jpg";
  return { ok: true, upload };
}`,
  },

  "uploads the asset untouched": {
    expect: "exif is NOT in the upload",
    impl: `function prepareAttachment(asset, limits) {
  if (!limits.allowedTypes.includes(asset.mimeType)) return { ok: false, reason: "type" };
  if (asset.fileSize > limits.maxBytes) return { ok: false, reason: "size" };
  return { ok: true, upload: asset };
}`,
  },

  "checks the size before the type": {
    expect: "type is reported before size",
    impl: `function prepareAttachment(asset, limits) {
  if (asset.fileSize > limits.maxBytes) return { ok: false, reason: "size" };
  if (!limits.allowedTypes.includes(asset.mimeType)) return { ok: false, reason: "type" };

  const name = String(asset.fileName ?? "").split(/[\\\\/]/).pop().trim();
  return {
    ok: true,
    upload: { uri: asset.uri, mimeType: asset.mimeType, fileName: name === "" ? "photo.jpg" : name },
  };
}`,
  },

  "rejects a file that is exactly at the limit": {
    expect: "a file exactly at the limit is accepted",
    impl: `function prepareAttachment(asset, limits) {
  if (!limits.allowedTypes.includes(asset.mimeType)) return { ok: false, reason: "type" };
  if (asset.fileSize >= limits.maxBytes) return { ok: false, reason: "size" };

  const name = String(asset.fileName ?? "").split(/[\\\\/]/).pop().trim();
  return {
    ok: true,
    upload: { uri: asset.uri, mimeType: asset.mimeType, fileName: name === "" ? "photo.jpg" : name },
  };
}`,
  },

  "passes the filename through without reducing the path": {
    expect: "a path is reduced to its last segment",
    impl: `function prepareAttachment(asset, limits) {
  if (!limits.allowedTypes.includes(asset.mimeType)) return { ok: false, reason: "type" };
  if (asset.fileSize > limits.maxBytes) return { ok: false, reason: "size" };

  const name = String(asset.fileName ?? "").trim();
  return {
    ok: true,
    upload: { uri: asset.uri, mimeType: asset.mimeType, fileName: name === "" ? "photo.jpg" : name },
  };
}`,
  },

  "strips exif by deleting it from the asset itself": {
    expect: "the asset is never mutated",
    impl: `function prepareAttachment(asset, limits) {
  if (!limits.allowedTypes.includes(asset.mimeType)) return { ok: false, reason: "type" };
  if (asset.fileSize > limits.maxBytes) return { ok: false, reason: "size" };

  delete asset.exif;                       // mutates the caller's asset
  const name = String(asset.fileName ?? "").split(/[\\\\/]/).pop().trim();
  return {
    ok: true,
    upload: { uri: asset.uri, mimeType: asset.mimeType, fileName: name === "" ? "photo.jpg" : name },
  };
}`,
  },

  "keeps the dimensions in the upload because the UI might want them": {
    expect: "the upload has exactly three keys",
    impl: `function prepareAttachment(asset, limits) {
  if (!limits.allowedTypes.includes(asset.mimeType)) return { ok: false, reason: "type" };
  if (asset.fileSize > limits.maxBytes) return { ok: false, reason: "size" };

  const name = String(asset.fileName ?? "").split(/[\\\\/]/).pop().trim();
  return {
    ok: true,
    upload: {
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileName: name === "" ? "photo.jpg" : name,
      width: asset.width,
      height: asset.height,
    },
  };
}`,
  },
};
