// Build-time typesetting for blog posts, so nothing shifts after load and it all works without JS.
//  1. A paragraph holding only an image becomes <figure>; an italic-only paragraph right after it
//     becomes its <figcaption>.
//  2. <span class="sn">aside</span> becomes a numbered sidenote: a superscript ref, a hidden checkbox
//     (tap-to-open on phones, pure CSS), and the note itself, which sits in the margin on wide screens.
//  3. Tables get a scroll wrapper so wide ones don't break the column on phones.

const isWs = (n) => n.type === "text" && !n.value.trim();
const kids = (n) => (n.children || []).filter((c) => !isWs(c));
const hasClass = (n, c) => {
  const cls = n.properties?.className;
  return Array.isArray(cls) ? cls.includes(c) : cls === c;
};
const el = (tagName, properties, children = []) => ({ type: "element", tagName, properties, children });

export default function rehypeEditorial() {
  return (tree) => {
    let noteN = 0;

    const walk = (node) => {
      if (!node.children) return;
      const out = [];
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];

        // 1. figures
        if (child.type === "element" && child.tagName === "p") {
          const k = kids(child);
          const isImg = (n) => n && n.type === "element" && n.tagName === "img";
          const isEm = (n) => n && n.type === "element" && n.tagName === "em";
          // image and caption written on consecutive lines land in the same paragraph
          if (k.length === 2 && isImg(k[0]) && isEm(k[1])) {
            out.push(el("figure", { className: ["figure"] }, [k[0], el("figcaption", {}, k[1].children)]));
            continue;
          }
          if (k.length === 1 && isImg(k[0])) {
            let j = i + 1;
            while (j < node.children.length && isWs(node.children[j])) j++;
            const next = node.children[j];
            const nk = next && next.type === "element" && next.tagName === "p" ? kids(next) : [];
            const caption = nk.length === 1 && nk[0].type === "element" && nk[0].tagName === "em" ? nk[0] : null;
            const fig = el("figure", { className: ["figure"] }, [k[0]]);
            if (caption) {
              fig.children.push(el("figcaption", {}, caption.children));
              i = j;
            }
            out.push(fig);
            continue;
          }
        }

        // 3. tables
        if (child.type === "element" && child.tagName === "table") {
          out.push(el("div", { className: ["table-wrap"] }, [child]));
          continue;
        }

        // 2. sidenotes. Inline HTML in markdown arrives as raw "<span class="sn">" ... "</span>" nodes
        //    around ordinary children, so gather everything between the pair into a span element first.
        if (child.type === "raw" && /^<span class="sn">$/.test(child.value.trim())) {
          const inner = [];
          let j = i + 1;
          while (j < node.children.length && !(node.children[j].type === "raw" && node.children[j].value.trim() === "</span>")) {
            inner.push(node.children[j]);
            j++;
          }
          if (j < node.children.length) {
            node.children.splice(i, j - i + 1, el("span", { className: ["sn"] }, inner));
            i--; // reprocess the new span element below
            continue;
          }
        }
        if (child.type === "element" && child.tagName === "span" && hasClass(child, "sn")) {
          noteN += 1;
          const id = `sn-${noteN}`;
          out.push(
            el("label", { htmlFor: id, className: ["sn-ref"], ariaLabel: `Note ${noteN}` }, [{ type: "text", value: String(noteN) }]),
            el("input", { type: "checkbox", id, className: ["sn-state"] }),
            el("span", { className: ["sn"], role: "note" }, [
              el("span", { className: ["sn-num"] }, [{ type: "text", value: String(noteN) }]),
              ...child.children,
            ])
          );
          continue;
        }

        walk(child);
        out.push(child);
      }
      node.children = out;
    };

    walk(tree);
  };
}
