/**
 * @class
 * @constructor
 * @param {OcrTool} ocrTool
 * @param {jQuery} $textbox The main text box.
 */
function LoadingWidget( ocrTool, $textbox ) {
	var config = {
		classes: [ 'ext-wikisource-LoadingWidget' ],
		framed: true
	};
	LoadingWidget.super.call( this, config );

	this.ocrTool = ocrTool;

	// UI elements.
	var cancelButton = new OO.ui.ButtonWidget( {
		label: mw.message( 'wikisource-ocr-extract-cancel' ).text(),
		framed: false,
		flags: [ 'progressive' ]
	} );
	var progressLabel = new OO.ui.LabelWidget( {
		label: mw.message( 'wikisource-ocr-extract-progress' ).text(),
		input: cancelButton
	} );
	this.$element.append( $.createSpinner(), progressLabel.$element, cancelButton.$element );
	// Start hidden.
	this.$element.hide();

	// Add the UI to the document.
	this.$textbox = $textbox;
	this.$textbox.wrap( '<div class="ext-wikisource-LoadingWidget-wrapper"></div>' );
	this.$textbox.after( this.$element );

	// Connect events.
	this.ocrTool.connect( this, {
		[ this.ocrTool.events.textExtractStart ]: 'show',
		[ this.ocrTool.events.cancelling ]: 'hide',
		[ this.ocrTool.events.textExtracted ]: 'hide',
		[ this.ocrTool.events.textExtractEnd ]: 'hide'
	} );
	cancelButton.connect( cancelButton, {
		click: function () {
			ocrTool.cancel();
		}
	} );
}

OO.inheritClass( LoadingWidget, OO.ui.PanelLayout );

LoadingWidget.prototype.show = function () {
	this.inProgress = true;
	var loadingWidget = this;
	window.setTimeout( function () {
		// Only show the loading widget if it's still needed after half a second.
		if ( loadingWidget.inProgress ) {
			loadingWidget.$element.show();
		}
	}, 500 );
	this.$textbox.attr( 'disabled', true );
};

LoadingWidget.prototype.hide = function () {
	this.inProgress = false;
	this.$element.slideUp( 600 );
	this.$textbox.attr( 'disabled', false );
};

module.exports = LoadingWidget;
