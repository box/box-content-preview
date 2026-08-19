/* eslint-disable react/prop-types */
const React = require('react');

// Lightweight mock that mirrors the public API surface used by box-content-preview
// without pulling in the full blueprint-web ESM tree (and its asset peer deps).
const Button = React.forwardRef(function Button(props, ref) {
    const { startIcon: _startIcon, endIcon: _endIcon, children, ...rest } = props;
    return React.createElement('button', { ref, type: 'button', ...rest }, children);
});

const IconButton = React.forwardRef(function IconButton(props, ref) {
    const { icon: Icon, ...rest } = props;
    return React.createElement('button', { ref, type: 'button', ...rest }, Icon ? React.createElement(Icon) : null);
});

const Tooltip = function Tooltip({ children, content: _content, ...rest }) {
    return React.createElement(React.Fragment, rest, children);
};
Tooltip.Provider = function TooltipProvider({ children }) {
    return React.createElement(React.Fragment, null, children);
};

module.exports = { Button, IconButton, Tooltip };
