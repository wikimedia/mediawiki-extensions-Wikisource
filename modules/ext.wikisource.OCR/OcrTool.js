var mwLocalStorage = require( 'mediawiki.storage' ).local;

/**
 * This is the central model for the OCR process.
 *
 * @param {string} toolUrl Base URL for the OCR tool.
 * @class
 * @constructor
 */
function OcrTool( toolUrl ) {
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
	// Array of language codes.
	this.langs = [ mw.config.get( 'wgContentLanguage' ) ];
	// Image URL.
	this.image = null;
	// Whether an OCR request is in progress, or has been cancelled.
	this.hasBeenCancelled = false;
	// Whether to show the onboarding pulsating dot and popup.
	this.showOnboarding = true;
	// The previous text in the edit box, to use when undoing. Must be set with setOldText().
	this.oldText = null;

	this.loadConfig();
}

OO.mixinClass( OcrTool, OO.EventEmitter );

/**
 * Time in milliseconds to hide or show loading and undo panel.
 */
OcrTool.static.normalSlideSpeed = 600;

OcrTool.prototype.saveConfig = function () {
	mwLocalStorage.set( 'wikisource-ocr', JSON.stringify( {
		engine: this.engine,
		showOnboarding: this.showOnboarding
	} ) );
};

OcrTool.prototype.loadConfig = function () {
	var config = JSON.parse( mwLocalStorage.get( 'wikisource-ocr' ) );
	if ( config === null ) {
		config = {};
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
 * @param {string} imageUrl URL of the image to transcribe. Set to null to use
 * the image set via this.setImage().
 * @param {boolean} api Whether to include the API endpoint.
 * @return {string} Full URL to the tool.
 */
OcrTool.prototype.getUrl = function ( imageUrl, api ) {
	var endpoint = api ? '/api.php' : '/';
	// @TODO Use URL() here when it's permitted in MediaWiki.
	return this.toolUrl + endpoint +
		'?engine=' + this.engine +
		'&langs[]=' + this.langs.join( '&langs[]=' ) +
		'&image=' + encodeURIComponent( imageUrl || this.image ) +
		'&uselang=' + mw.config.get( 'wgUserLanguage' );
};

OcrTool.prototype.setImage = function ( image ) {
	this.image = image;
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

OcrTool.prototype.preloadNextPage = function () {
	// TODO Can we do this reliably for more than one page?
	const nextImageEl = $( 'link[title="prp-next-image"]' );
	if ( nextImageEl.length ) {
		// Ignore any error
		$.get( this.getUrl( nextImageEl.get( 0 ).href, true ) );
	}
};

module.exports = OcrTool;
