var LoadingWidget = require( './LoadingWidget.js' ),
	UndoWidget = require( './UndoWidget.js' ),
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

	var extractButton = new OO.ui.ButtonWidget( {
		icon: 'ocr',
		label: mw.message( 'wikisource-ocr-extract-text' ).text(),
		title: mw.message( 'wikisource-ocr-extract-text-title' ).text()
	} );
	extractButton.$icon.addClass( 'ext-wikisource-icon-ocr' );
	extractButton.connect( this, {
		click: 'onClickExtractButton'
	} );

	this.configButton = new OO.ui.PopupButtonWidget( {
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
	// Replace the build in click handler with our own.
	this.configButton.disconnect( this.configButton, { click: 'onAction' } );
	this.configButton.connect( this, { click: 'onClickConfigButton' } );

	var config = {
		classes: [ 'ext-wikisource-ExtractTextWidget' ],
		items: [ extractButton, this.configButton ]
	};

	ExtractTextWidget.super.call( this, config );

	this.loadingWidget = new LoadingWidget( this.ocrTool, this.$textbox );
	this.undoWidget = new UndoWidget( this.ocrTool, this.$textbox );

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
		href: this.ocrTool.getUrl( null, false ),
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

/**
 * @private
 * @param {Function} nextCloseAction
 * @return {boolean} Whether to continue or not after calling this.
 */
ExtractTextWidget.prototype.handleOnboardingDisplay = function ( nextCloseAction ) {
	// If the onboarding popup is available and not yet open, open it when
	// clicking the button. The button will need to be clicked again in order to
	// run the OCR (at which point the popup will close and be dismissed forever).
	if ( this.ocrTool.getShowOnboarding() ) {
		if ( this.onboardingPopup.popup.isVisible() ) {
			// If the onboarding popup is already shown, clicking on the config
			// button hides it by simulating clicking "Okay, got it".
			this.onboardingPopup.onPopupButtonClick();
			return true;
		} else {
			// Open the onboarding popup and set the desired behaviour when clicking "Okay, got it."
			this.onboardingPopup.setNextCloseAction( nextCloseAction );
			this.onboardingPopup.popup.toggle( true );
			return false;
		}
	}
	return true;
};

ExtractTextWidget.prototype.onClickConfigButton = function () {
	var popup = this.configButton.popup;
	var onboardingHandled = this.handleOnboardingDisplay( function () {
		popup.toggle();
	} );
	if ( !onboardingHandled ) {
		return;
	}

	// Replicate the behaviour from OO.ui.PopupButtonWidget.prototype.onAction
	this.configButton.popup.toggle();
};

ExtractTextWidget.prototype.onClickExtractButton = function () {
	var ocrTool = this.ocrTool;
	var onboardingHandled = this.handleOnboardingDisplay( function () {
		ocrTool.extractText();
	} );
	if ( !onboardingHandled ) {
		return;
	}

	// Run OCR.
	this.ocrTool.extractText();
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
	this.ocrTool.setOldText( this.$textbox.textSelection( 'getContents' ) );
	this.$textbox.textSelection( 'setContents', response.text );
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
		this.advancedLink.setHref( this.ocrTool.getUrl( null, false ) );
	}
};

module.exports = ExtractTextWidget;
