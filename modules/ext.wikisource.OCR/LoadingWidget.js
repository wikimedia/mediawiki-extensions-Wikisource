/**
 * @class
 * @constructor
 * @param {OcrTool} ocrTool
 * @param {jQuery} $textbox The main text box.
 */
function LoadingWidget( ocrTool, $textbox ) {
	var config = {
		classes: [ 'ext-wikisource-TextBoxWidget' ],
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
	this.$element.append( $.createSpinner().addClass( 'ext-wikisource-TextBoxWidget-icon' ), progressLabel.$element, cancelButton.$element );
	// Start hidden.
	this.$element.hide();

	// Add the UI to the document, above the textbox.
	this.$textbox = $textbox;
	this.$textbox.before( this.$element );

	// Connect events.
	this.ocrTool.connect( this, {
		[ this.ocrTool.events.textExtractStart ]: 'show',
		[ this.ocrTool.events.cancelling ]: [ 'hide', this.ocrTool.normalSlideSpeed ],
		[ this.ocrTool.events.textExtracted ]: [ 'hide', 0 ],
		[ this.ocrTool.events.textExtractEnd ]: [ 'hide', this.ocrTool.normalSlideSpeed ]
	} );
	cancelButton.connect( cancelButton, {
		click: function () {
			ocrTool.cancel();
		}
	} );
}

OO.inheritClass( LoadingWidget, OO.ui.Widget );

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

LoadingWidget.prototype.hide = function ( speed ) {
	this.inProgress = false;
	this.$element.slideUp( speed );
	this.$textbox.attr( 'disabled', false );
};

module.exports = LoadingWidget;
