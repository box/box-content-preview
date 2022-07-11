let userName = '';
let mediaContainerEl;
let watermark;

function callback(mutations) {
    mutations.forEach(mutation => {
        mutation.removedNodes.forEach(node => {
            if (node.classList.contains('watermark')) {
                addWatermark();
            }
        });
    });
}

function onWatermarkMutation(mutations) {
    if (styleObserverPaused) return;
    mutations.forEach(({ attributeName, target }) => {
        let watermarkNode = target;
        if (watermarkNode !== watermark) {
            while (!watermarkNode.classList?.contains('watermark')) {
                watermarkNode = watermarkNode.parentNode;
            }
        }
        // const watermarkNode = target.nodeType === Node.TEXT_NODE ? target.parentNode : target;
        // if (watermarkNode) {
        //     watermarkNode.parentNode.removeChild(watermarkNode);
        // }
        styleObserverPaused = true;
        setWatermarkProps(watermarkNode);
        setTimeout(() => (styleObserverPaused = false));
    });
}

function setWatermarkProps(watermarkNode) {
    watermarkNode.classList.add('watermark');
    watermarkNode.innerHTML = `<span class="bp-default-logo" style="padding-left: 30px">
    <svg height="25" width="45" viewBox="0 0 98 52" focusable="false">
        <path
            d="M95.34 44.7c1.1 1.53.8 3.66-.75 4.8-1.56 1.13-3.74.84-4.93-.64l-7.8-10.23-7.82 10.23c-1.2 1.48-3.36 1.77-4.9.63-1.55-1.15-1.87-3.28-.75-4.8l9.06-11.86L68.4 21c-1.1-1.54-.8-3.67.75-4.8 1.55-1.14 3.72-.85 4.9.63l7.82 10.23 7.8-10.23c1.2-1.48 3.38-1.77 4.92-.63 1.52 1.13 1.84 3.26.73 4.8L86.3 32.84l9.04 11.85zM53.9 43.22c-5.86 0-10.6-4.65-10.6-10.4 0-5.72 4.74-10.37 10.6-10.37 5.85 0 10.6 4.65 10.6 10.38 0 5.74-4.75 10.4-10.6 10.4zm-31.23 0c-5.85 0-10.6-4.65-10.6-10.4 0-5.72 4.75-10.37 10.6-10.37 5.86 0 10.6 4.65 10.6 10.38 0 5.74-4.74 10.4-10.6 10.4zm31.22-27.7c-6.78 0-12.66 3.73-15.63 9.2-2.97-5.47-8.84-9.2-15.6-9.2-4 0-7.66 1.3-10.6 3.46V4.38C12.02 2.52 10.45 1 8.53 1 6.6 1 5.03 2.5 5 4.4v28.7c.16 9.43 8 17.03 17.67 17.03 6.77 0 12.64-3.73 15.6-9.2 2.98 5.47 8.86 9.2 15.62 9.2 9.74 0 17.66-7.75 17.66-17.32 0-9.55-7.92-17.3-17.68-17.3z"
        ></path>
    </svg>
    <div>${userName}</div>
</span>`;
    watermarkNode.querySelector('.bp-default-logo').style.setProperty('fill', '#0061d5', 'important');
    watermarkNode.style.setProperty('font-size', '20px', 'important');
    watermarkNode.style.setProperty('color', '#0061d5', 'important');
    watermarkNode.style.setProperty('position', 'absolute', 'important');
    watermarkNode.style.setProperty('right', '100px', 'important');
    watermarkNode.style.setProperty('bottom', '100px', 'important');
}

function addWatermark() {
    watermark = mediaContainerEl.appendChild(document.createElement('div'));
    setWatermarkProps(watermark);
    console.log('watermark', watermark);

    const observerOptions = {
        attributes: true,
        attributeFilter: ['class', 'style'],
        childList: true,
        characterData: true,
        subtree: true,
    };
    styleObserver.observe(watermark, observerOptions);
}

const observer = new MutationObserver(callback);
let styleObserver = new MutationObserver(onWatermarkMutation);
let styleObserverPaused = false;

async function addReactForms(container) {
    mediaContainerEl = container;

    while (!(userName = localStorage.getItem('username'))) {
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    const observerOptions = {
        childList: true,
    };
    observer.observe(mediaContainerEl, observerOptions);

    addWatermark();
}
