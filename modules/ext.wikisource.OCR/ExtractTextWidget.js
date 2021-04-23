var OcrTool = require( './OcrTool.js' );

/**
 * @class
 * @constructor
 * @param {OcrTool} ocrTool
 * @param {jQuery} $prpImage
 */
function ExtractTextWidget( ocrTool, $prpImage ) {
	var config = {
		classes: [ 'ext-wikisource-ExtractTextWidget' ],
		icon: 'ocr',
		label: mw.message( 'wikisource-ocr-extract-text' ).text(),
		title: mw.message( 'wikisource-ocr-extract-text-title' ).text()
	};
	ExtractTextWidget.super.call( this, config );
	this.$icon.addClass( 'ext-wikisource-icon-ocr' );
	this.ocrTool = ocrTool;
	this.$prpImage = $prpImage;
}

OO.inheritClass( ExtractTextWidget, OO.ui.ButtonWidget );

ExtractTextWidget.prototype.onClick = function () {
	var imgSrc = this.$prpImage.find( 'img' )[ 0 ].src,
		url = this.ocrTool.getUrl( imgSrc, 'tesseract', [] ),
		textbox = document.querySelector( '#wpTextbox1' ),
		extractTextWidget = this;
	// Disable the UI.
	this.setDisabled( true );
	textbox.disabled = true;
	// Fetch the OCR text.
	$.getJSON( url )
		.done( function ( result ) {
			extractTextWidget.processOcrResult( result, textbox );
		} )
		.fail( function ( result ) {
			// Same handler, for simplicity.
			extractTextWidget.processOcrResult( result, textbox );
		} )
		.always( function () {
			// Re-enable the UI.
			textbox.disabled = false;
			extractTextWidget.setDisabled( false );
		} );
};

/**
 * The API result (either the OCR'd text, or an error message) is processed by
 * this function.
 *
 * @param {string} response The response (either text or error) returned from the API.
 * @param {HTMLTextAreaElement} textbox The main editing textbox.
 */
ExtractTextWidget.prototype.processOcrResult = function ( response, textbox ) {
	if ( response.responseJSON !== undefined && response.responseJSON.error ) {
		mw.notify( mw.msg( 'wikisource-ocr-error', response.responseJSON.error ) );
		return;
	}
	if ( response.text === undefined || response.text.length === 0 ) {
		mw.notify( mw.msg( 'wikisource-ocr-no-text' ) );
		return;
	}
	textbox.value = response.text;
};

module.exports = ExtractTextWidget;
