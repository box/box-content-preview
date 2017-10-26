import DiffMatchPatch from 'diff-match-patch';

class DiffController {
    getDiffOps(beforeText, afterText) {
        const differ = new DiffMatchPatch();
        const diffs = differ.diff_main(beforeText, afterText);
        // differ.diff_cleanupSemantic(diffs);
        return diffs;
    }

    iterateDOMNodes(node, func) {
        func(node);
        node = node.firstChild;
        while (node) {
            this.iterateDOMNodes(node, func);
            node = node.nextSibling;
        }
    }

    getTextNodesAndAllText(node) {
        const textNodes = [];
        let allText = '';
        this.iterateDOMNodes(node, (curNode) => {
            if (curNode.nodeType === 3) {
                const text = curNode.data;
                if (text.length) {
                    textNodes.push([curNode, text]);
                    allText += text;
                }
            }
        });
        return {
            textNodes,
            allText
        };
    }

    zipTextNodesAndDiffOps(alltext, textOps, diffOps) {
        const length = alltext.length;
        const index = 0;
        let textOpIndex = 0;
        let diffOpIndex = 0;

        let currentTextOp = textOps[textOpIndex];
        let currentDiffOp = diffOps[diffOpIndex];
        let currentReplacementNode = document.createDocumentFragment();
        while (1) {
            // If we fully consumed the text op, iterate to the next one
            if (currentTextOp && !currentTextOp[1]) {
                // Replace the old text node with our new diffed node
                currentTextOp[0].parentElement.replaceChild(currentReplacementNode, currentTextOp[0]);

                // Increment to the next text node
                textOpIndex++;
                currentTextOp = textOps[textOpIndex];

                // If the next text node exists, create a new empty replacement note
                if (currentTextOp) {
                    currentReplacementNode = document.createDocumentFragment();
                }
            }

            // If we fully consumed the diff op, iterate to the next one
            if (!currentDiffOp[1]) {
                diffOpIndex++;
                currentDiffOp = diffOps[diffOpIndex];
            }

            if (!currentDiffOp || !currentTextOp) break;

            // Dictate logic via the diff ops
            switch (currentDiffOp[0]) {
                case -1:
                    // No-op for deletes for now
                    currentDiffOp[1] = '';
                    break;
                case 0:
                    // Create a text node since this is a keep operation
                    const keptTextNode = document.createTextNode('');

                    // If the diff op is larger than the text op, consume the text op
                    if (currentTextOp[1].length <= currentDiffOp[1].length) {
                        keptTextNode.data = currentTextOp[1];
                        currentDiffOp[1] = currentDiffOp[1].slice(currentTextOp[1].length);
                        currentTextOp[1] = '';

                        // Otherwise consume the diff op
                    } else {
                        keptTextNode.data = currentDiffOp[1];
                        currentTextOp[1] = currentTextOp[1].slice(currentDiffOp[1].length);
                        currentDiffOp[1] = '';
                    }

                    // Append the text node to our current replacement node
                    currentReplacementNode.appendChild(keptTextNode);
                    break;
                case 1:
                    // Since this is an insert, we want the span with the diff highlight
                    const highlightedTextNode = document.createElement('span');
                    highlightedTextNode.classList.add('unseen-change');

                    // If the diff op is larger than the text op, consume the text op
                    if (currentTextOp[1].length <= currentDiffOp[1].length) {
                        highlightedTextNode.innerText = currentTextOp[1];
                        currentDiffOp[1] = currentDiffOp[1].slice(currentTextOp[1].length);
                        currentTextOp[1] = '';

                        // Otherwise consume the diff op
                    } else {
                        highlightedTextNode.innerText = currentDiffOp[1];
                        currentTextOp[1] = currentTextOp[1].slice(currentDiffOp[1].length);
                        currentDiffOp[1] = '';
                    }

                    // Append the span element with the text to our replacement node
                    currentReplacementNode.appendChild(highlightedTextNode);
                    break;
                // no default
            }
        }
    }
}

export default DiffController;
