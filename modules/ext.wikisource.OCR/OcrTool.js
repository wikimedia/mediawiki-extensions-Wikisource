var mwLocalStorage = require( 'mediawiki.storage' ).local;
var Langs = require( './Langs.json' );

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
		undoing: 'undoing',
		languageLoaded: 'languageLoaded',
		error: 'error'
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
	// Selected languages/models for engine
	this.langs = [];
	// Available languages/models for engines
	this.allLangs = Langs;

	this.loadConfig();
}

OO.mixinClass( OcrTool, OO.EventEmitter );

/**
 * Time in milliseconds to hide or show loading and undo panel.
 */
OcrTool.static.normalSlideSpeed = 600;

OcrTool.prototype.saveConfig = function () {
	var stringifiedConfig = JSON.stringify( {
		engine: this.engine,
		langs: this.langs,
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

	if ( config.langs === undefined ) {
		config.langs = this.langs;
	}
	this.langs = config.langs;
	this.emit( this.events.languageLoaded, this.engine );
};

/**
 * @param {string} engine
 */
OcrTool.prototype.setEngine = function ( engine ) {
	this.engine = engine;
	this.saveConfig();
};

/**
 * @param {Array} langs
 */
OcrTool.prototype.setLangs = function ( langs ) {
	this.langs = langs;
	this.saveConfig();
};

/**
 * @return {string}
 */
OcrTool.prototype.getEngine = function () {
	return this.engine;
};

/**
 * @return {Array}
 */
OcrTool.prototype.getLangs = function () {
	return this.langs;
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
	// Success handler
	var handleTextExtracted = function ( result ) {
		if ( ocrTool.hasBeenCancelled ) {
			// If the user has clicked 'cancel', ignore the result.
			return;
		}
		ocrTool.emit( ocrTool.events.textExtracted, result );
	};
	// Error handler
	var handleError = function ( errorInfo ) {
		if ( ocrTool.hasBeenCancelled ) {
			return;
		}
		ocrTool.emit( ocrTool.events.error, errorInfo );
	};

	$.ajax( {
		url: ocrTool.getUrl( null, true ),
		dataType: 'json',
		success: handleTextExtracted,
		error: handleError,
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
