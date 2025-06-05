var LoadingWidget = require( './LoadingWidget.js' ),
	UndoWidget = require( './UndoWidget.js' ),
	OnboardingPopup = require( './OnboardingPopup.js' );

/**
 * @class
 * @constructor
 * @param {OcrTool} ocrTool
 * @param {jQuery} $textbox
 */
function ExtractTextWidget( ocrTool, $textbox ) {
	this.ocrTool = ocrTool;
	this.openseadragonInstance = null;
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
			align: 'force-left'
		}
	} );
	// Replace the build in click handler with our own.
	this.configButton.disconnect( this.configButton, { click: 'onAction' } );
	this.configButton.connect( this, { click: 'onClickConfigButton' } );

	// While the PopupWidget.toggle() closes the popup,
	// the RadioSelectWidget.onDocumentKeyDown() method retains focus on the
	// radio buttons and allows the arrow keys to change the selected engine,
	// even when the popup is closed
	// So, disable the RadioSelect widget when the popup is closed
	this.configButton.popup.connect( this, { closing: () => {
		this.radioSelect.setDisabled( true );
	} } );

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
	// Handle the returned text and language updates.
	this.ocrTool.connect( this, {
		[ this.ocrTool.events.textExtracted ]: 'processOcrResult',
		[ this.ocrTool.events.error ]: 'processOcrResult',
		[ this.ocrTool.events.languageLoaded ]: 'updateMoreOptionsFields'
	} );

	this.onboardingPopup = new OnboardingPopup( this.ocrTool );
	this.$element.append( this.onboardingPopup.$element );
}

OO.inheritClass( ExtractTextWidget, OO.ui.ButtonGroupWidget );

ExtractTextWidget.prototype.getConfigContent = function () {
	let ocrOptions = [
		new OO.ui.RadioOptionWidget( {
			data: 'tesseract',
			label: mw.msg( 'wikisource-ocr-engine-tesseract' )
		} ),
		new OO.ui.RadioOptionWidget( {
			data: 'google',
			label: mw.msg( 'wikisource-ocr-engine-google' )
		} ),
		new OO.ui.RadioOptionWidget( {
			data: 'transkribus',
			label: mw.msg( 'wikisource-ocr-engine-transkribus' )
		} )
	];

	this.moreOptionsFieldset = new OO.ui.FieldsetLayout( {
		classes: [ 'ext-wikisource-ocr-more-options' ]
	} );

	// create fieldset for line detection checkbox
	this.fieldset = new OO.ui.FieldsetLayout( {} );
	this.lineDetectionCheckBox = new OO.ui.CheckboxInputWidget( {
		selected: false
	} );
	this.fieldset.addItems( [
		new OO.ui.FieldLayout( this.lineDetectionCheckBox, { label: mw.msg( 'wikisource-ocr-engine-line-model-checkbox-label' ), align: 'inline' } )
	] );
	this.lineDetectionCheckBox.connect( this, {
		change: 'setLineDetectionModel'
	} );

	this.fieldset.toggle( this.ocrTool.getEngine() === 'transkribus' );
	this.radioSelect = new OO.ui.RadioSelectWidget( {
		classes: [ 'ext-wikisource-ocr-engineradios' ],
		items: ocrOptions
	} );
	var label = new OO.ui.LabelWidget( {
		classes: [ 'ext-wikisource-ocr-engine-label' ],
		label: mw.msg( 'wikisource-ocr-engine' ),
		input: this.radioSelect
	} );
	this.radioSelect.connect( this, {
		choose: 'onEngineChoose'
	} );
	this.radioSelect.selectItemByData( this.ocrTool.getEngine() );

	this.advancedLink = new OO.ui.ButtonWidget( {
		label: mw.msg( 'wikisource-ocr-advanced' ),
		title: mw.msg( 'wikisource-ocr-advanced-title' ),
		// If Openseadragon is already initialized, dynamically generate
		// the image. Otherwise, use the default image
		href: this.ocrTool.getUrl( null, false ),
		icon: 'linkExternal',
		classes: [ 'ext-wikisource-ocr-advanced-link' ],
		target: '_base'
	} );
	this.updateMoreOptionsFields();
	var content = new OO.ui.PanelLayout( {
		padded: false,
		expanded: false,
		classes: [ 'ext-wikisource-ocr-config-panel' ]
	} );
	content.$element.append(
		label.$element,
		this.radioSelect.$element,
		this.fieldset.$element,
		this.moreOptionsFieldset.$element,
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

/**
 * Manage changing the current Openseadragon instance. Since the advanced link is a link (and cannot
 * dynamically pull the image URL from Openseadragon), we bind a event handler to reset/set
 * the advanced options link every time Openseadragon is reinitialized (which is required to load
 * an Image eithier by EditInSequence or via userscripts.
 *
 * @param {Object} openseadragonInstance Current instance of Openseadragon being used by the page
 */
ExtractTextWidget.prototype.setOSDInstance = function ( openseadragonInstance ) {
	if ( this.openseadragonInstance !== null ) {
		this.openseadragonInstance.off( 'prp-osd-after-creation', this.resetAdvancedLink.bind( this ) );
	}
	this.openseadragonInstance = openseadragonInstance;
	this.ocrTool.setOSDInstance( this.openseadragonInstance );
	this.openseadragonInstance.on( 'prp-osd-after-creation', this.resetAdvancedLink.bind( this ) );
};

ExtractTextWidget.prototype.resetAdvancedLink = function () {
	this.advancedLink.setHref( this.ocrTool.getUrl( null, false ) );
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

	// Enable the radio select widget based on popup visibilty
	this.radioSelect.setDisabled( !this.configButton.popup.isVisible() );
	// Focus the radio button on clicking the config button
	// allowing the option to be changed by arrow keys on the keyboard
	this.radioSelect.focus();
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
		// enable the checkbox for line detection only if the
		// selected engine is Transkribus
		this.lineDetectionCheckBox.setDisabled( item.data !== 'transkribus' );
		this.fieldset.toggle( item.data === 'transkribus' );

		this.updateMoreOptionsFields();
		// Also update the advanced link's URL.
		this.advancedLink.setHref( this.ocrTool.getUrl( null, false ) );
	}
};

/**
 * On changing the line detection model checkbox selection.
 *
 */
ExtractTextWidget.prototype.setLineDetectionModel = function () {
	if ( this.lineDetectionCheckBox.selected ) {
		this.ocrTool.setLineId( false );
	} else {
		this.ocrTool.setLineId( true );
	}
	// Also update the advanced link's URL.
	this.advancedLink.setHref( this.ocrTool.getUrl( null, false ) );
};

ExtractTextWidget.prototype.setLanguages = function ( items ) {
	let langs = [];
	items.forEach( element => {
		langs.push( element.data );
	} );
	this.updateOcrTool( langs );
};

ExtractTextWidget.prototype.setModel = function ( item ) {
	this.updateOcrTool( [ item ] );
};

ExtractTextWidget.prototype.updateOcrTool = function ( item ) {
	this.ocrTool.setLangs( item );
	this.advancedLink.setHref( this.ocrTool.getUrl( null, false ) );
};

ExtractTextWidget.prototype.updateMoreOptionsFields = function () {
	let engine = this.ocrTool.getEngine();
	this.moreOptionsFieldset.clearItems();
	let options = this.getLanguages( engine );
	let fieldLabel = this.setLanguageDropdownLabel( engine );
	let selectedLanguages = this.sortSelectedLangs( engine );

	if ( engine !== 'transkribus' ) {
		this.languageDropdown = new OO.ui.MenuTagMultiselectWidget( {
			options: options
		} );
		this.languageDropdown.connect( this, {
			change: 'setLanguages'
		} );
		this.languageDropdown.setValue( selectedLanguages );
	} else {
		this.languageDropdown = new OO.ui.DropdownInputWidget( {
			options: options
		} );
		this.languageDropdown.connect( this, {
			change: 'setModel'
		} );
		if ( selectedLanguages[ 0 ] !== undefined ) {
			let value = selectedLanguages[ 0 ].data;
			this.languageDropdown.setValue( value );
		}
	}

	let dropdowns = [
		new OO.ui.FieldLayout( this.languageDropdown, { label: fieldLabel, align: 'inline' } )
	];

	this.moreOptionsFieldset.addItems( dropdowns );
};

ExtractTextWidget.prototype.setLanguageDropdownLabel = function ( engine ) {
	let fieldLabel = mw.msg( 'wikisource-ocr-language-dropdown-label' );
	if ( engine === 'transkribus' ) {
		fieldLabel = mw.msg( 'wikisource-ocr-model-dropdown-label' );
	}
	return fieldLabel;
};

ExtractTextWidget.prototype.getLanguages = function ( engine ) {
	let items = [];
	let engineLanguages = this.ocrTool.allLangs[ engine ];
	for ( let key in engineLanguages ) {
		let data = engineLanguages[ key ];
		items.push( {
			data: key,
			label: data
		} );
	}
	return items;
};

ExtractTextWidget.prototype.sortSelectedLangs = function ( engine ) {
	let selectedLangs = this.ocrTool.getLangs();
	let langs = [];
	let engineLanguages = this.ocrTool.allLangs[ engine ];
	for ( let langIndex in selectedLangs ) {
		for ( let key in engineLanguages ) {
			if ( key === selectedLangs[ langIndex ] ) {
				langs.push( {
					data: key,
					label: engineLanguages[ key ]
				} );
			}
		}
	}
	return langs;
};

module.exports = ExtractTextWidget;
