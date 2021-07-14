var LoadingWidget = require( './LoadingWidget.js' ),
	OnboardingPopup = require( './OnboardingPopup.js' );

/**
 * @class
 * @constructor
 * @param {OcrTool} ocrTool
 * @param {jQuery} $prpImage
 * @param {jQuery} $textbox
 */
function ExtractTextWidget( ocrTool, $prpImage, $textbox ) {
	this.ocrTool = ocrTool;
	this.ocrTool.setImage( $prpImage.find( 'img' )[ 0 ].src );
	this.$textbox = $textbox;
	this.initialText = $textbox.val();

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
		indicator: 'down',
		title: mw.message( 'wikisource-ocr-settings-menu' ).text(),
		invisibleLabel: true,
		$overlay: OO.ui.getDefaultOverlay(),
		popup: {
			anchor: false,
			$content: this.getConfigContent().$element,
			padded: false,
			align: 'force-left',
			// @TODO Remove this workaround for RTL scroll bug T285912.
			hideWhenOutOfView: false
		}
	} );

	var config = {
		classes: [ 'ext-wikisource-ExtractTextWidget' ],
		items: [ extractButton, configButton ]
	};

	ExtractTextWidget.super.call( this, config );

	this.loadingWidget = new LoadingWidget( this.ocrTool, this.$textbox );

	// Enable and disable the extract button.
	this.ocrTool.connect( extractButton, {
		[ this.ocrTool.events.textExtractStart ]: [ 'setDisabled', true ],
		[ this.ocrTool.events.cancelling ]: [ 'setDisabled', false ],
		[ this.ocrTool.events.textExtracted ]: [ 'setDisabled', false ],
		[ this.ocrTool.events.textExtractEnd ]: [ 'setDisabled', false ]
	} );
	// Handle the returned text.
	this.ocrTool.connect( this, {
		[ this.ocrTool.events.textExtracted ]: 'processOcrResult'
	} );

	this.onboardingPopup = new OnboardingPopup( this.ocrTool );
	this.$element.append( this.onboardingPopup.$element );
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
		href: this.ocrTool.getUrl( false ),
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
	// If the onboarding popup is available and not yet open, open it when
	// clicking the button. The button will need to be clicked again in order to
	// run the OCR (at which point the popup will close and be dismissed forever).
	if ( this.ocrTool.getShowOnboarding() ) {
		if ( this.onboardingPopup.popup.isVisible() ) {
			// Simulate clicking "Okay, got it".
			this.onboardingPopup.onPopupButtonClick();
		} else {
			this.onboardingPopup.popup.toggle( true );
			return;
		}
	}

	// Run OCR.
	const curText = this.$textbox.val();
	if ( curText !== '' && curText !== this.initialText ) {
		var that = this;
		OO.ui.confirm( mw.msg( 'wikisource-ocr-overwrite-warning' ), {
			title: mw.msg( 'wikisource-ocr-overwrite-confirm' )
		} ).done( function ( confirmed ) {
			if ( confirmed ) {
				that.ocrTool.extractText();
			}
		} );
	} else {
		this.ocrTool.extractText();
	}
};

/**
 * The API result (either the OCR'd text, or an error message) is processed by
 * this function.
 *
 * @param {string} response The response (either text or error) returned from the API.
 */
ExtractTextWidget.prototype.processOcrResult = function ( response ) {
	if ( response.responseJSON !== undefined && response.responseJSON.error ) {
		mw.notify( mw.msg( 'wikisource-ocr-error', response.responseJSON.error ) );
		return;
	}
	if ( response.text === undefined || response.text.length === 0 ) {
		mw.notify( mw.msg( 'wikisource-ocr-no-text' ) );
		return;
	}
	this.$textbox[ 0 ].value = response.text;
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
		this.advancedLink.setHref( this.ocrTool.getUrl( false ) );
	}
};

module.exports = ExtractTextWidget;
