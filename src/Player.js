import eventBus from './eventBus';
import Scrubber from './Scrubber';
import React from 'react';

class Player extends React.Component {
	constructor() {
		super();

		eventBus.on('scrubber.scrubbing', function(data) {
			console.log(data);
		});
	}

	render() {
		return <div className="player"><Scrubber value='.25' buffered='.5' converted='.8' /></div>;
	}
}

module.exports = Player;
