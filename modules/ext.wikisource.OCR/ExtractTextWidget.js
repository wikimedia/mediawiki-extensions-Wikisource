var OcrTool = require( './OcrTool.js' );

/**
 * @class
 * @constructor
 * @param {OcrTool} ocrTool
 * @param {jQuery} $prpImage
 */
function ExtractTextWidget( ocrTool, $prpImage ) {
	this.ocrTool = ocrTool;
	this.prpImage = $prpImage.find( 'img' )[ 0 ].src;

	var extractButton = new OO.ui.ButtonWidget( {
		icon: 'ocr',
		label: mw.message( 'wikisource-ocr-extract-text' ).text(),
		title: mw.message( 'wikisource-ocr-extract-text-title' ).text()
	} );
	extractButton.$icon.addClass( 'ext-wikisource-icon-ocr' );
	extractButton.connect( this, {
		click: 'onClick'
	} );

	var configButton = new OO.ui.PopupButtonWidget( {
		icon: 'expand',
		title: mw.message( 'wikisource-ocr-settings-menu' ).text(),
		invisibleLabel: true,
		popup: {
			anchor: false,
			$content: this.getConfigContent().$element,
			padded: false,
			align: 'force-left'
		}
	} );

	var config = {
		classes: [ 'ext-wikisource-ExtractTextWidget' ],
		items: [ extractButton, configButton ]
	};

	ExtractTextWidget.super.call( this, config );
}

OO.inheritClass( ExtractTextWidget, OO.ui.ButtonGroupWidget );

ExtractTextWidget.prototype.getConfigContent = function () {
	var radioSelect = new OO.ui.RadioSelectWidget( {
			classes: [ 'ext-wikisource-ocr-engineradios' ],
			items: [
				new OO.ui.RadioOptionWidget( {
					data: 'tesseract',
					label: mw.msg( 'wikisource-ocr-engine-tesseract' )
				} ),
				new OO.ui.RadioOptionWidget( {
					data: 'google',
					label: mw.msg( 'wikisource-ocr-engine-google' )
				} )
			]
		} ),
		label = new OO.ui.LabelWidget( {
			classes: [ 'ext-wikisource-ocr-engine-label' ],
			label: mw.msg( 'wikisource-ocr-engine' ),
			input: radioSelect
		} );
	radioSelect.connect( this, {
		choose: 'onEngineChoose'
	} );
	radioSelect.selectItemByData( this.ocrTool.getEngine() );

	this.advancedLink = new OO.ui.ButtonWidget( {
		label: mw.msg( 'wikisource-ocr-advanced' ),
		title: mw.msg( 'wikisource-ocr-advanced-title' ),
		href: this.ocrTool.getUrl( false, this.prpImage ),
		icon: 'linkExternal',
		classes: [ 'ext-wikisource-ocr-advanced-link' ],
		target: '_base'
	} );

	var content = new OO.ui.PanelLayout( {
		padded: false,
		expanded: false,
		classes: [ 'ext-wikisource-ocr-config-panel' ]
	} );
	content.$element.append(
		label.$element,
		radioSelect.$element,
		this.advancedLink.$element
	);

	return content;
};

ExtractTextWidget.prototype.onClick = function () {
	var url = this.ocrTool.getUrl( true, this.prpImage ),
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

/**
 * On changing the selected OCR engine.
 *
 * @param {OO.ui.OptionWidget} item Chosen item.
 * @param {boolean} selected Item is selected.
 */
ExtractTextWidget.prototype.onEngineChoose = function ( item, selected ) {
	if ( selected ) {
		this.ocrTool.setEngine( item.data );
		// Also update the advanced link's URL.
		this.advancedLink.setHref( this.ocrTool.getUrl( false, this.prpImage ) );
	}
};

module.exports = ExtractTextWidget;
