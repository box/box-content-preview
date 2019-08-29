# Upgrading Guide

## Upgrading from 1.x to 2.x

Version 2 includes a breaking change to the DOM structure of the Preview element.

In version 1, the `.bp-navigate` buttons were siblings with the `.bp` container div

```
<div class="bp" tabindex="0">
    ...
</div>
<button class="bp-btn-plain bp-navigate bp-navigate-left bp-is-hidden">
    ...
</button>
<button class="bp-btn-plain bp-navigate bp-navigate-right bp-is-hidden">
    ...
</button>
```

But in version 2, the buttons are now inside a new container div `.bp-content`.

```
<div class="bp" tabindex="0">
    <div class="bp-content">
        <button class="bp-btn-plain bp-navigate bp-navigate-left bp-is-hidden">
            ...
        </button>
        <button class="bp-btn-plain bp-navigate bp-navigate-right bp-is-hidden">
            ...
        </button>
    </div>
</div>
```

`.bp-content` is also the new point in which the various viewers will be dynamically inserted as children, i.e. `.bp-doc`, `.bp-image`, etc...

This change in structure is to account for the new thumbnails sidebar which will appear to the left of the viewer content.
