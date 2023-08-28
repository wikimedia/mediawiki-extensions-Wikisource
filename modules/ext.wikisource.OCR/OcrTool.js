var mwLocalStorage = require( 'mediawiki.storage' ).local;

/**
 * This is the central model for the OCR process.
 *
 * @param {string} toolUrl Base URL for the OCR tool.
 * @param {string} backupPageImageURL Image URL to use if Openseadragon has not been initialized yet
 * @class
 * @constructor
 */
function OcrTool( toolUrl, backupPageImageURL ) {
	OO.EventEmitter.call( this );

	// Event names.
	this.events = {
		cancelling: 'cancelling',
		textExtractStart: 'textExtractStart',
		textExtracted: 'textExtracted',
		textExtractEnd: 'textExtractEnd',
		undoing: 'undoing'
	};

	// Base URL of the tool.
	this.toolUrl = toolUrl;
	// Engine name.
	this.engine = 'tesseract';
	// Openseadragon instance associated with the page
	this.openseadragonInstance = null;
	// Backup $prpImage URL
	this.backupPageImageURL = backupPageImageURL;
	// Whether an OCR request is in progress, or has been cancelled.
	this.hasBeenCancelled = false;
	// Whether to show the onboarding pulsating dot and popup.
	this.showOnboarding = true;
	// The previous text in the edit box, to use when undoing. Must be set with setOldText().
	this.oldText = null;

	this.loadConfig();
	this.setLanguage();
}

OO.mixinClass( OcrTool, OO.EventEmitter );

/**
 * Time in milliseconds to hide or show loading and undo panel.
 */
OcrTool.static.normalSlideSpeed = 600;

OcrTool.prototype.saveConfig = function () {
	var stringifiedConfig = JSON.stringify( {
		engine: this.engine,
		showOnboarding: this.showOnboarding
	} );
	if ( mw.user.isAnon() ) {
		mwLocalStorage.set( 'wikisource-ocr', stringifiedConfig );
	} else {
		mwLocalStorage.remove( 'wikisource-ocr' );
		mw.user.options.set( 'wikisource-ocr', stringifiedConfig );
		( new mw.Api() ).saveOption( 'wikisource-ocr', stringifiedConfig );
	}
};

OcrTool.prototype.loadConfig = function () {
	var config = JSON.parse( mw.user.options.get( 'wikisource-ocr' ) );
	if ( config === null ) {
		// Legacy config
		config = JSON.parse( mwLocalStorage.get( 'wikisource-ocr' ) ) || {};
	}
	if ( config.engine === undefined ) {
		config.engine = 'tesseract';
	}
	this.engine = config.engine;
	if ( config.showOnboarding === undefined ) {
		config.showOnboarding = true;
	}
	this.showOnboarding = config.showOnboarding;
};

/**
 * @param {string} engine
 */
OcrTool.prototype.setEngine = function ( engine ) {
	this.engine = engine;
	this.saveConfig();
};

/**
 * @return {string}
 */
OcrTool.prototype.getEngine = function () {
	return this.engine;
};

/**
 * Whether the onboarding popup should be shown.
 *
 * @return {boolean}
 */
OcrTool.prototype.getShowOnboarding = function () {
	return this.showOnboarding;
};

OcrTool.prototype.setShowOnboarding = function ( showOnboarding ) {
	this.showOnboarding = !!showOnboarding;
	this.saveConfig();
};

/**
 * Get the full URL to the OCR tool.
 *
 * @param {string} imageUrl URL of the image to transcribe. This will use the Openseadragon instance
 * passed by the constructor
 * @param {boolean} api Whether to include the API endpoint.
 * @return {string} Full URL to the tool.
 */
OcrTool.prototype.getUrl = function ( imageUrl, api ) {
	var endpoint = api ? '/api.php' : '/';

	if ( !imageUrl ) {
		if ( this.openseadragonInstance ) {
			imageUrl = this.openseadragonInstance.getCurrentImage();
		} else {
			imageUrl = this.backupPageImageURL;
		}
	}

	// @TODO Use URL() here when it's permitted in MediaWiki.
	return this.toolUrl + endpoint +
		'?engine=' + this.engine +
		'&langs[]=' + this.langs.join( '&langs[]=' ) +
		'&image=' + encodeURIComponent( imageUrl ) +
		'&line_id=' + ( this.lineId || '' ) +
		'&uselang=' + mw.config.get( 'wgUserLanguage' );
};

/**
 * Sets the Openseadragon instance
 *
 * @param {Object} openseadragonInstance Instance of Openseadragon associated with the page
 */
OcrTool.prototype.setOSDInstance = function ( openseadragonInstance ) {
	this.openseadragonInstance = openseadragonInstance;
};

OcrTool.prototype.cancel = function () {
	this.hasBeenCancelled = true;
	this.emit( this.events.cancelling );
};

OcrTool.prototype.undo = function () {
	if ( this.oldText === null ) {
		// The oldText should always have been set in ExtractTextWidget.processOcrResult(),
		// even if it's to an empty string.
		mw.log.error( 'OcrTool.undo() has been called without OcrTool.setOldText() being called first.' );
	}
	this.emit( this.events.undoing, this.oldText );
};

OcrTool.prototype.extractText = function () {
	this.hasBeenCancelled = false;
	this.emit( this.events.textExtractStart );
	var ocrTool = this;
	// Use the same function for success and error.
	var handleTextExtracted = function ( result ) {
		if ( ocrTool.hasBeenCancelled ) {
			// If the user has clicked 'cancel', ignore the result.
			return;
		}
		ocrTool.emit( ocrTool.events.textExtracted, result );
	};
	$.ajax( {
		url: ocrTool.getUrl( null, true ),
		dataType: 'json',
		success: handleTextExtracted,
		error: handleTextExtracted,
		complete: function ( jqXHR, textStatus ) {
			ocrTool.emit( ocrTool.events.textExtractEnd, jqXHR, textStatus );
			ocrTool.preloadNextPage();
		}
	} );
};

/**
 * @param {string} oldText
 */
OcrTool.prototype.setOldText = function ( oldText ) {
	this.oldText = oldText;
};

/**
 * Set models as languages if Transkribus OCR engine is selected
 * else use default content language.
 */
OcrTool.prototype.setLanguage = function () {
	this.langs = [ mw.config.get( 'wgContentLanguage' ) ];

	if ( this.engine === 'transkribus' ) {
		let transkribusModels = mw.config.get( 'WikisourceTranskribusModels' );
		let modelkey = mw.config.get( 'wgDBname' );
		if ( transkribusModels[ modelkey ] && transkribusModels[ modelkey ].htr ) {
			this.langs = transkribusModels[ modelkey ].htr.slice( 0, 1 );
		}
	}
};

/**
 * Set line detection model ID if Transkribus OCR engine is selected
 *
 * @param {boolean} unset
 */
OcrTool.prototype.setLineId = function ( unset ) {
	if ( this.engine === 'transkribus' ) {
		if ( unset ) {
			this.lineId = null;
		} else {
			let transkribusModels = mw.config.get( 'WikisourceTranskribusModels' );
			let modelkey = mw.config.get( 'wgDBname' );
			if ( transkribusModels[ modelkey ] && transkribusModels[ modelkey ].line ) {
				this.lineId = transkribusModels[ modelkey ].line;
			}
		}
	}
};

OcrTool.prototype.preloadNextPage = function () {
	// TODO Can we do this reliably for more than one page?
	const nextImageEl = $( 'link[title="prp-next-image"]' );
	if ( nextImageEl.length ) {
		// Ignore any error
		$.get( this.getUrl( nextImageEl.get( 0 ).href, true ) );
	}
};

module.exports = OcrTool;
