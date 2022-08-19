/**
 * @class
 * @constructor
 * @param {OcrTool} ocrTool
 * @param {jQuery} $textbox The main text box.
 */
function UndoWidget( ocrTool, $textbox ) {
	var config = {
		classes: [ 'ext-wikisource-TextBoxWidget ext-wikisource-UndoWidget' ],
		framed: true
	};
	UndoWidget.super.call( this, config );
	this.ocrTool = ocrTool;

	// UI elements.
	var undoButton = new OO.ui.ButtonWidget( {
		label: mw.message( 'wikisource-ocr-extract-undo' ).text(),
		framed: false,
		flags: [ 'progressive' ],
		icon: 'undo'
	} );
	var closeButton = new OO.ui.ButtonWidget( {
		icon: 'close',
		framed: false,
		title: mw.message( 'wikisource-ocr-extract-close' ).text()
	} );
	this.$element.hide();
	this.$element.append( undoButton.$element, closeButton.$element );

	// Add the UI to the document.
	this.$textbox = $textbox;
	this.$textbox.before( this.$element );

	// Connect events.
	this.ocrTool.connect( this, {
		[ this.ocrTool.events.textExtractStart ]: 'hide',
		[ this.ocrTool.events.undoing ]: 'undo',
		[ this.ocrTool.events.textExtracted ]: 'show'
	} );
	undoButton.connect( undoButton, {
		click: function () {
			ocrTool.undo();
		}
	} );
	var that = this;
	closeButton.connect( this, {
		click: function () {
			that.$element.slideUp( that.ocrTool.normalSlideSpeed );
		}
	} );
}

OO.inheritClass( UndoWidget, OO.ui.Widget );

UndoWidget.prototype.show = function () {
	var that = this;
	that.$element.show();
	// Hide it 30 seconds later.
	window.setTimeout( function () {
		that.$element.slideUp( that.ocrTool.normalSlideSpeed );
	}, 1000 * 30 );
};

UndoWidget.prototype.undo = function ( oldText ) {
	var that = this;
	// Momentarily empty the text box, to give visual indication of the text changing.
	this.$textbox.textSelection( 'setContents', '' );
	window.setTimeout( function () {
		that.$textbox.textSelection( 'setContents', oldText );
	}, 100 );
	// Pause for a moment before hiding the widget.
	window.setTimeout( function () {
		that.$element.slideUp( that.ocrTool.normalSlideSpeed );
	}, 500 );
};

UndoWidget.prototype.hide = function () {
	this.$element.hide();
};

module.exports = UndoWidget;
