/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports) {

	/**
	 * @author dmarcos / https://github.com/dmarcos
	 * @author mrdoob / http://mrdoob.com
	 */

	const THREE = window.THREE || {};

	THREE.VRControls = function ( object, onError ) {

	    var scope = this;

	    var vrDisplay, vrDisplays;

	    var standingMatrix = new THREE.Matrix4();

	    var frameData = null;

	    if ( 'VRFrameData' in window ) {

	        frameData = new VRFrameData();

	    }

	    function gotVRDisplays( displays ) {

	        vrDisplays = displays;

	        if ( displays.length > 0 ) {

	            vrDisplay = displays[ 0 ];

	        } else {

	            if ( onError ) onError( 'VR input not available.' );

	        }

	    }

	    if ( navigator.getVRDisplays ) {

	        navigator.getVRDisplays().then( gotVRDisplays ).catch ( function () {

	            console.warn( 'THREE.VRControls: Unable to get VR Displays' );

	        } );

	    }

	    // the Rift SDK returns the position in meters
	    // this scale factor allows the user to define how meters
	    // are converted to scene units.

	    this.scale = 1;

	    // If true will use "standing space" coordinate system where y=0 is the
	    // floor and x=0, z=0 is the center of the room.
	    this.standing = false;

	    // Distance from the users eyes to the floor in meters. Used when
	    // standing=true but the VRDisplay doesn't provide stageParameters.
	    this.userHeight = 1.6;

	    this.getVRDisplay = function () {

	        return vrDisplay;

	    };

	    this.setVRDisplay = function ( value ) {

	        vrDisplay = value;

	    };

	    this.getVRDisplays = function () {

	        console.warn( 'THREE.VRControls: getVRDisplays() is being deprecated.' );
	        return vrDisplays;

	    };

	    this.getStandingMatrix = function () {

	        return standingMatrix;

	    };

	    this.update = function () {

	        if ( vrDisplay ) {

	            var pose;

	            if ( vrDisplay.getFrameData ) {

	                vrDisplay.getFrameData( frameData );
	                pose = frameData.pose;

	            } else if ( vrDisplay.getPose ) {

	                pose = vrDisplay.getPose();

	            }

	            if ( pose.orientation !== null ) {

	                object.quaternion.fromArray( pose.orientation );

	            }

	            if ( pose.position !== null ) {

	                object.position.fromArray( pose.position );

	            } else {

	                object.position.set( 0, 0, 0 );

	            }

	            if ( this.standing ) {

	                if ( vrDisplay.stageParameters ) {

	                    object.updateMatrix();

	                    standingMatrix.fromArray( vrDisplay.stageParameters.sittingToStandingTransform );
	                    object.applyMatrix( standingMatrix );

	                } else {

	                    object.position.setY( object.position.y + this.userHeight );

	                }

	            }

	            object.position.multiplyScalar( scope.scale );

	        }

	    };

	    this.resetPose = function () {

	        if ( vrDisplay ) {

	            vrDisplay.resetPose();

	        }

	    };

	    this.resetSensor = function () {

	        console.warn( 'THREE.VRControls: .resetSensor() is now .resetPose().' );
	        this.resetPose();

	    };

	    this.zeroSensor = function () {

	        console.warn( 'THREE.VRControls: .zeroSensor() is now .resetPose().' );
	        this.resetPose();

	    };

	    this.dispose = function () {

	        vrDisplay = null;

	    };

	};

/***/ }
/******/ ]);