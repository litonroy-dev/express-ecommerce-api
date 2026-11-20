// Escape special regex characters so user input like "a+b(" can't break the search.
module.exports = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
