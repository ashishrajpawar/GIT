/* dom-sandbox.js — an in-memory `document` for playgrounds.
 *
 * WHY THIS EXISTS
 *
 * `playground.js` runs student code through `new Function`, which executes in
 * the page's own scope. That is harmless for `01/0005-loops`, where the worst
 * a student can do is print too much. It is not harmless for `01/0007`, which
 * teaches the DOM and localStorage:
 *
 *   document.body.innerHTML = "";   deletes the lesson being read
 *   localStorage.clear();           wipes the student's course progress,
 *                                   because progress.js stores it there
 *
 * Both are things a beginner types *on purpose* while experimenting. So a
 * playground marked `dom: true` gets this module's fake `document`, `window`
 * and `localStorage` injected in place of the real ones.
 *
 * The second reason is verification. `scripts/verify-lesson.mjs` runs under
 * Node, where there is no DOM at all, so it skipped every `predict-output`
 * question mentioning `document` and let DOM playgrounds fail open. CLAUDE.md
 * requires verifying a lesson by running it, never by reading it — which was
 * impossible for DOM lessons until this file existed. verify-lesson.mjs now
 * loads this module, so the browser and the verifier run the same DOM.
 *
 * NOT A SECURITY BOUNDARY. It stops accidents, not attacks — a student who
 * wants out can reach the real page through a constructor chain. That is fine;
 * the threat model is "curious beginner", not "adversary".
 *
 * DELIBERATE LIMITS (documented so nobody debugs them as mysteries):
 *   - selectors: tag, #id, .class, [attr], [attr="v"], compounds like
 *     `input[type='text']` or `.a.b`, descendant combinators, and comma groups.
 *     NOT supported: `>`, `+`, `~`, `:hover`, `:nth-child`, `*`.
 *   - no layout. offsetWidth, getBoundingClientRect and friends are absent, so
 *     anything measuring the page cannot be taught here.
 *   - no CSS cascade. `.style` holds what you set; it never reflects a rule
 *     from a stylesheet, exactly like real inline style.
 *   - innerHTML parsing handles tags, attributes, text and comments. It has no
 *     error recovery for malformed HTML — a browser would fix it up, this
 *     throws instead, which is more useful in a lesson than silence.
 */
(function (global) {
  "use strict";

  /* Elements that never have children or a closing tag. */
  var VOID = {
    area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1,
    link: 1, meta: 1, param: 1, source: 1, track: 1, wbr: 1
  };

  var ENTITIES = {
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
    "&#39;": "'", "&apos;": "'", "&nbsp;": " "
  };

  function decode(text) {
    return text.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g, function (m) {
      return ENTITIES[m];
    });
  }

  function escapeText(text) {
    return String(text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function escapeAttr(value) {
    return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }

  /* backgroundColor -> background-color */
  function kebab(prop) {
    return prop.replace(/[A-Z]/g, function (c) { return "-" + c.toLowerCase(); });
  }

  // -------------------------------------------------------------- text nodes

  function TextNode(text) {
    this.nodeType = 3;
    this.nodeName = "#text";
    this.nodeValue = String(text);
    this.parentNode = null;
    this.__isDomNode = true;
  }

  TextNode.prototype.toString = function () { return escapeText(this.nodeValue); };

  // ----------------------------------------------------------------- element

  function Element(tagName, ownerDocument) {
    this.nodeType = 1;
    this.tagName = String(tagName).toUpperCase();
    this.nodeName = this.tagName;
    this.childNodes = [];
    this.parentNode = null;
    this.ownerDocument = ownerDocument;
    this.__isDomNode = true;
    this.__attrs = {};      /* lowercased name -> string, insertion-ordered */
    this.__listeners = {};  /* type -> [fn] */
    this.style = {};
    this.classList = makeClassList(this);

    /* Inputs and textareas carry their text in `.value`, not `.textContent` —
       the distinction 01/0007 spends a whole section on. */
    if (this.tagName === "INPUT" || this.tagName === "TEXTAREA" ||
        this.tagName === "SELECT" || this.tagName === "OPTION") {
      this.value = "";
    }
  }

  function makeClassList(el) {
    function read() {
      var raw = el.__attrs["class"];
      if (!raw) return [];
      return raw.split(/\s+/).filter(Boolean);
    }
    function write(list) {
      if (list.length) el.__attrs["class"] = list.join(" ");
      else delete el.__attrs["class"];
    }
    return {
      add: function () {
        var list = read();
        for (var i = 0; i < arguments.length; i++) {
          var name = String(arguments[i]);
          if (list.indexOf(name) === -1) list.push(name);
        }
        write(list);
      },
      remove: function () {
        var list = read();
        for (var i = 0; i < arguments.length; i++) {
          var at = list.indexOf(String(arguments[i]));
          if (at !== -1) list.splice(at, 1);
        }
        write(list);
      },
      toggle: function (name, force) {
        name = String(name);
        var list = read();
        var present = list.indexOf(name) !== -1;
        var wanted = arguments.length > 1 ? !!force : !present;
        if (wanted === present) return present;
        if (wanted) list.push(name); else list.splice(list.indexOf(name), 1);
        write(list);
        return wanted;
      },
      contains: function (name) { return read().indexOf(String(name)) !== -1; },
      get length() { return read().length; },
      item: function (i) { return read()[i] || null; },
      toString: function () { return read().join(" "); }
    };
  }

  /* id and className are attribute reflections, as in the real DOM: setting
     either one has to show up in the serialised markup. */
  Object.defineProperty(Element.prototype, "id", {
    get: function () { return this.__attrs.id || ""; },
    set: function (v) { this.__attrs.id = String(v); }
  });

  Object.defineProperty(Element.prototype, "className", {
    get: function () { return this.__attrs["class"] || ""; },
    set: function (v) {
      if (String(v)) this.__attrs["class"] = String(v);
      else delete this.__attrs["class"];
    }
  });

  Object.defineProperty(Element.prototype, "children", {
    get: function () {
      return this.childNodes.filter(function (n) { return n.nodeType === 1; });
    }
  });

  Object.defineProperty(Element.prototype, "firstElementChild", {
    get: function () { return this.children[0] || null; }
  });

  Object.defineProperty(Element.prototype, "lastElementChild", {
    get: function () {
      var kids = this.children;
      return kids[kids.length - 1] || null;
    }
  });

  Object.defineProperty(Element.prototype, "textContent", {
    get: function () {
      return this.childNodes.map(function (n) {
        return n.nodeType === 3 ? n.nodeValue : n.textContent;
      }).join("");
    },
    set: function (v) {
      this.childNodes.forEach(function (n) { n.parentNode = null; });
      this.childNodes = [];
      if (v !== "" && v != null) this.appendChild(new TextNode(v));
    }
  });

  Object.defineProperty(Element.prototype, "innerHTML", {
    get: function () {
      return this.childNodes.map(function (n) { return n.toString(); }).join("");
    },
    set: function (html) {
      var nodes = parseHTML(String(html), this.ownerDocument);
      this.childNodes.forEach(function (n) { n.parentNode = null; });
      this.childNodes = [];
      for (var i = 0; i < nodes.length; i++) this.appendChild(nodes[i]);
    }
  });

  Object.defineProperty(Element.prototype, "outerHTML", {
    get: function () { return this.toString(); }
  });

  Element.prototype.setAttribute = function (name, value) {
    this.__attrs[String(name).toLowerCase()] = String(value);
  };

  Element.prototype.getAttribute = function (name) {
    var key = String(name).toLowerCase();
    return Object.prototype.hasOwnProperty.call(this.__attrs, key)
      ? this.__attrs[key] : null;
  };

  Element.prototype.hasAttribute = function (name) {
    return Object.prototype.hasOwnProperty.call(this.__attrs, String(name).toLowerCase());
  };

  Element.prototype.removeAttribute = function (name) {
    delete this.__attrs[String(name).toLowerCase()];
  };

  Element.prototype.appendChild = function (node) {
    if (!node || !node.__isDomNode) {
      throw new TypeError(
        "appendChild expects an element or text node. You passed " +
        (typeof node) + " — did you mean to create it with " +
        "document.createElement() first?"
      );
    }
    if (VOID[this.tagName.toLowerCase()]) {
      throw new Error("<" + this.tagName.toLowerCase() + "> cannot have children.");
    }
    if (node.parentNode) node.parentNode.removeChild(node);
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  };

  Element.prototype.insertBefore = function (node, ref) {
    if (ref == null) return this.appendChild(node);
    var at = this.childNodes.indexOf(ref);
    if (at === -1) throw new Error("insertBefore: the reference node is not a child of this element.");
    if (node.parentNode) node.parentNode.removeChild(node);
    node.parentNode = this;
    this.childNodes.splice(at, 0, node);
    return node;
  };

  Element.prototype.removeChild = function (node) {
    var at = this.childNodes.indexOf(node);
    if (at === -1) throw new Error("removeChild: that node is not a child of this element.");
    this.childNodes.splice(at, 1);
    node.parentNode = null;
    return node;
  };

  Element.prototype.remove = function () {
    if (this.parentNode) this.parentNode.removeChild(this);
  };

  Element.prototype.contains = function (node) {
    for (var n = node; n; n = n.parentNode) if (n === this) return true;
    return false;
  };

  /* No layout in this DOM, so scrolling is a no-op. 01/0007 calls it at the
     end of addMessageToUI; throwing there would derail the lesson's point. */
  Element.prototype.scrollIntoView = function () {};
  Element.prototype.focus = function () {};
  Element.prototype.blur = function () {};

  Element.prototype.querySelector = function (sel) {
    return querySelectorAll(this, sel)[0] || null;
  };

  Element.prototype.querySelectorAll = function (sel) {
    return querySelectorAll(this, sel);
  };

  Element.prototype.matches = function (sel) {
    return matchesAny(this, parseSelector(sel));
  };

  Element.prototype.closest = function (sel) {
    var groups = parseSelector(sel);
    for (var n = this; n && n.nodeType === 1; n = n.parentNode) {
      if (matchesAny(n, groups)) return n;
    }
    return null;
  };

  Element.prototype.addEventListener = function (type, fn) {
    if (typeof fn !== "function") return;
    var list = this.__listeners[type] || (this.__listeners[type] = []);
    if (list.indexOf(fn) === -1) list.push(fn);
  };

  Element.prototype.removeEventListener = function (type, fn) {
    var list = this.__listeners[type];
    if (!list) return;
    var at = list.indexOf(fn);
    if (at !== -1) list.splice(at, 1);
  };

  Element.prototype.dispatchEvent = function (event) {
    event.target = event.target || this;
    /* Bubble up the ancestor chain, as a real event does — 01/0008 teaches
       delegation, which only makes sense if bubbling actually happens. */
    for (var node = this; node; node = node.parentNode) {
      if (event.__stopped) break;
      event.currentTarget = node;
      var handler = node["on" + event.type];
      if (typeof handler === "function") handler.call(node, event);
      var list = node.__listeners && node.__listeners[event.type];
      if (list) {
        list.slice().forEach(function (fn) { fn.call(node, event); });
      }
      if (!event.bubbles) break;
    }
    return !event.defaultPrevented;
  };

  Element.prototype.click = function () {
    return this.dispatchEvent(new SandboxEvent("click", { bubbles: true }));
  };

  /* Serialising to markup is what `console.log(el)` and the playground's DOM
     preview both show, so it doubles as the student's window onto the tree. */
  Element.prototype.toString = function () {
    var tag = this.tagName.toLowerCase();
    var out = "<" + tag;
    var self = this;

    Object.keys(this.__attrs).forEach(function (name) {
      out += " " + name + '="' + escapeAttr(self.__attrs[name]) + '"';
    });

    var styleKeys = Object.keys(this.style).filter(function (k) {
      return typeof self.style[k] !== "function" && self.style[k] !== "";
    });
    if (styleKeys.length) {
      out += ' style="' + escapeAttr(styleKeys.map(function (k) {
        return kebab(k) + ": " + self.style[k];
      }).join("; ")) + '"';
    }

    out += ">";
    if (VOID[tag]) return out;
    return out + this.innerHTML + "</" + tag + ">";
  };

  // ------------------------------------------------------------------- event

  function SandboxEvent(type, opts) {
    opts = opts || {};
    this.type = String(type);
    this.bubbles = opts.bubbles !== false;
    this.target = opts.target || null;
    this.currentTarget = null;
    this.defaultPrevented = false;
    this.__stopped = false;
    /* Keyboard and input extras, so 01/0008 can teach `event.key === "Enter"`
       without a second event class. */
    if (opts.key !== undefined) this.key = opts.key;
    if (opts.value !== undefined) this.value = opts.value;
  }

  SandboxEvent.prototype.preventDefault = function () { this.defaultPrevented = true; };
  SandboxEvent.prototype.stopPropagation = function () { this.__stopped = true; };

  // ---------------------------------------------------------------- selectors

  /* "div.a, #b input[type='text']" ->
     [ [compound], [compound, compound] ], outermost ancestor first. */
  function parseSelector(selector) {
    if (typeof selector !== "string" || !selector.trim()) {
      throw new SyntaxError("'" + selector + "' is not a valid selector.");
    }
    return selector.split(",").map(function (group) {
      var parts = group.trim().split(/\s+/).filter(Boolean);
      if (!parts.length) throw new SyntaxError("'" + selector + "' is not a valid selector.");
      return parts.map(parseCompound);
    });
  }

  function parseCompound(text) {
    var compound = { tag: null, id: null, classes: [], attrs: [] };
    var pattern = /([#.]?)([A-Za-z][\w-]*)|\[([\w-]+)(?:([~^$*|]?=)(['"]?)(.*?)\5)?\]/g;
    var match;
    var consumed = 0;

    while ((match = pattern.exec(text)) !== null) {
      consumed += match[0].length;
      if (match[3] !== undefined) {
        compound.attrs.push({ name: match[3].toLowerCase(), value: match[6] });
      } else if (match[1] === "#") {
        compound.id = match[2];
      } else if (match[1] === ".") {
        compound.classes.push(match[2]);
      } else {
        compound.tag = match[2].toUpperCase();
      }
    }

    if (consumed !== text.length) {
      throw new SyntaxError(
        "'" + text + "' is not a selector this playground understands. " +
        "It supports tag, #id, .class and [attr=\"value\"], combined and " +
        "separated by spaces — but not >, +, ~ or pseudo-classes like :first-child."
      );
    }
    return compound;
  }

  function matchesCompound(el, compound) {
    if (compound.tag && el.tagName !== compound.tag) return false;
    if (compound.id && el.id !== compound.id) return false;
    for (var i = 0; i < compound.classes.length; i++) {
      if (!el.classList.contains(compound.classes[i])) return false;
    }
    for (var j = 0; j < compound.attrs.length; j++) {
      var attr = compound.attrs[j];
      /* `.value` is a live property on inputs, not an attribute — but
         [value="x"] reading as "never matches" would confuse more than help. */
      var actual = el.getAttribute(attr.name);
      if (actual === null && attr.name === "value" && "value" in el) actual = el.value;
      if (actual === null) return false;
      if (attr.value !== undefined && actual !== attr.value) return false;
    }
    return true;
  }

  /* Walk the compound chain right-to-left: the last one must match `el`, each
     earlier one must match some ancestor, in order. */
  function matchesChain(el, chain) {
    if (!matchesCompound(el, chain[chain.length - 1])) return false;
    var at = chain.length - 2;
    var node = el.parentNode;
    while (at >= 0) {
      if (!node || node.nodeType !== 1) return false;
      if (matchesCompound(node, chain[at])) at--;
      node = node.parentNode;
    }
    return true;
  }

  function matchesAny(el, groups) {
    for (var i = 0; i < groups.length; i++) {
      if (matchesChain(el, groups[i])) return true;
    }
    return false;
  }

  /* Returns a real array. The real DOM returns a NodeList, which has forEach
     and length but no map or filter — the lesson says "similar to an array".
     Handing back an array makes `.map` work here and fail in a browser, so the
     extras are removed rather than left as a trap. */
  function makeNodeList(items) {
    var list = items.slice();
    list.map = list.filter = list.reduce = function () {
      throw new TypeError(
        "A NodeList is not an array — it has forEach and length, but not map, " +
        "filter or reduce. Convert it first: Array.from(nodeList).map(...)"
      );
    };
    return list;
  }

  function querySelectorAll(root, selector) {
    var groups = parseSelector(selector);
    var found = [];
    (function walk(node) {
      node.childNodes.forEach(function (child) {
        if (child.nodeType !== 1) return;
        if (matchesAny(child, groups)) found.push(child);
        walk(child);
      });
    })(root);
    return makeNodeList(found);
  }

  // ------------------------------------------------------------- HTML parsing

  function parseHTML(html, doc) {
    var roots = [];
    var stack = [];
    var i = 0;

    function push(node) {
      if (stack.length) stack[stack.length - 1].appendChild(node);
      else roots.push(node);
    }

    while (i < html.length) {
      var lt = html.indexOf("<", i);

      if (lt === -1) {
        if (i < html.length) push(new TextNode(decode(html.slice(i))));
        break;
      }
      if (lt > i) push(new TextNode(decode(html.slice(i, lt))));

      if (html.substr(lt, 4) === "<!--") {
        var end = html.indexOf("-->", lt);
        i = end === -1 ? html.length : end + 3;
        continue;
      }

      var close = /^<\/([A-Za-z][\w-]*)\s*>/.exec(html.slice(lt));
      if (close) {
        var name = close[1].toUpperCase();
        if (!stack.length || stack[stack.length - 1].tagName !== name) {
          throw new SyntaxError(
            "Unexpected closing tag </" + close[1] + "> in your HTML. " +
            (stack.length
              ? "The open tag here is <" + stack[stack.length - 1].tagName.toLowerCase() + ">."
              : "Nothing was open at that point.")
          );
        }
        stack.pop();
        i = lt + close[0].length;
        continue;
      }

      var open = /^<([A-Za-z][\w-]*)((?:\s+[\w-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/.exec(html.slice(lt));
      if (!open) {
        throw new SyntaxError(
          "Could not parse the HTML starting at \"" +
          html.slice(lt, lt + 30) + "\". A tag looks malformed."
        );
      }

      var el = doc.createElement(open[1]);
      var attrPattern = /([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
      var attr;
      while ((attr = attrPattern.exec(open[2])) !== null) {
        var value = attr[2] !== undefined ? attr[2]
          : attr[3] !== undefined ? attr[3]
          : attr[4] !== undefined ? attr[4] : "";
        el.setAttribute(attr[1], decode(value));
        if (attr[1].toLowerCase() === "value" && "value" in el) el.value = decode(value);
      }

      push(el);
      var tagLower = open[1].toLowerCase();
      if (!open[3] && !VOID[tagLower]) stack.push(el);
      i = lt + open[0].length;
    }

    if (stack.length) {
      throw new SyntaxError(
        "Your HTML has an unclosed <" + stack[stack.length - 1].tagName.toLowerCase() +
        "> tag."
      );
    }
    return roots;
  }

  // ---------------------------------------------------------- fake localStorage

  /* progress.js keeps the student's completed lessons in the real
     localStorage. A playground calling clear() would erase months of it, so
     playgrounds get this instead: same API, plain object behind it. */
  function makeStorage() {
    var data = {};
    return {
      getItem: function (k) {
        k = String(k);
        return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
      },
      setItem: function (k, v) { data[String(k)] = String(v); },
      removeItem: function (k) { delete data[String(k)]; },
      clear: function () { data = {}; },
      key: function (i) { return Object.keys(data)[i] || null; },
      get length() { return Object.keys(data).length; }
    };
  }

  // -------------------------------------------------------------------- entry

  /**
   * createDomSandbox(initialHTML) -> { document, window, localStorage, serialize }
   *
   * `initialHTML` becomes the contents of <body>. `serialize()` returns the
   * body's current markup, which is what the playground shows as a preview.
   */
  function createDomSandbox(initialHTML) {
    var doc = {
      nodeType: 9,
      title: "Playground",
      createElement: function (tag) {
        if (!/^[A-Za-z][\w-]*$/.test(String(tag))) {
          throw new SyntaxError("'" + tag + "' is not a valid tag name.");
        }
        return new Element(tag, doc);
      },
      createTextNode: function (text) { return new TextNode(text); },
      /* A tree walk rather than querySelector("#" + id), so ids the selector
         grammar would reject (a leading digit, say) still resolve. */
      getElementById: function (id) {
        id = String(id);
        var found = null;
        (function walk(node) {
          for (var i = 0; i < node.childNodes.length && !found; i++) {
            var child = node.childNodes[i];
            if (child.nodeType !== 1) continue;
            if (child.id === id) { found = child; return; }
            walk(child);
          }
        })(doc.documentElement);
        return found;
      },
      getElementsByClassName: function (name) {
        return doc.querySelectorAll("." + String(name));
      },
      getElementsByTagName: function (name) {
        return doc.querySelectorAll(String(name));
      },
      querySelector: function (sel) { return doc.documentElement.querySelector(sel); },
      querySelectorAll: function (sel) { return doc.documentElement.querySelectorAll(sel); },
      addEventListener: function (type, fn) { doc.documentElement.addEventListener(type, fn); },
      removeEventListener: function (type, fn) { doc.documentElement.removeEventListener(type, fn); },
      dispatchEvent: function (e) { return doc.documentElement.dispatchEvent(e); }
    };

    doc.documentElement = new Element("html", doc);
    doc.head = new Element("head", doc);
    doc.body = new Element("body", doc);
    doc.documentElement.appendChild(doc.head);
    doc.documentElement.appendChild(doc.body);

    if (initialHTML) doc.body.innerHTML = initialHTML;

    var storage = makeStorage();
    var win = {
      document: doc,
      localStorage: storage,
      sessionStorage: makeStorage(),
      Event: SandboxEvent,
      location: { href: "https://tokn.app/playground", pathname: "/playground" },
      navigator: { userAgent: "Playground" },
      addEventListener: function () {},
      removeEventListener: function () {},
      alert: function () {},
      __isSandbox: true
    };
    win.window = win;
    win.self = win;

    return {
      document: doc,
      window: win,
      localStorage: storage,
      Event: SandboxEvent,
      serialize: function () { return doc.body.innerHTML; }
    };
  }

  global.createDomSandbox = createDomSandbox;

})(typeof window !== "undefined" ? window : this);
