/**
 * The OnboardingPopup is the pulsating dot and the popup widget.
 *
 * @constructor
 * @class
 * @param {OcrTool} ocrTool
 */
function OnboardingPopup( ocrTool ) {
	// If the onboarding has already been dismissed, do nothing.
	if ( !ocrTool.getShowOnboarding() ) {
		return;
	}
	this.ocrTool = ocrTool;

	// Okay button.
	const okayButton = new OO.ui.ButtonWidget( {
		label: mw.msg( 'wikisource-ocr-onboarding-button' ),
		flags: [ 'progressive', 'primary' ]
	} );
	okayButton.connect( this, { click: 'onPopupButtonClick' } );

	// Pusating dot.
	const $pulsatingDot = $( '<a>' ).addClass( 'ext-wikisource-ocr-onboarding-dot mw-pulsating-dot' );

	// Popup.
	const $popupContent = $( '<div>' ).append(
		$( '<div>' ).addClass( 'ext-wikisource-icon-ocr-onboarding' ),
		$( '<h3>' ).text( mw.msg( 'wikisource-ocr-onboarding-title' ) ),
		$( '<p>' ).text( mw.msg( 'wikisource-ocr-onboarding-text' ) ),
		$( '<div>' ).addClass( 'ext-wikisource-ocr-onboarding-button' )
			.append( okayButton.$element )
	);
	const popup = new OO.ui.PopupWidget( {
		classes: [ 'ext-wikisource-ocr-onboarding-popup' ],
		$floatableContainer: $pulsatingDot,
		$content: $popupContent,
		padded: true,
		width: 300,
		align: 'backwards'
	} );
	this.popup = popup;

	// Toggle the popup when the dot is clicked.
	$pulsatingDot.on( 'click', function () {
		popup.toggle();
	} );
	// Close the popup when clicking anywhere outside it or the dot.
	$( 'html' ).on( 'click', function ( event ) {
		const $parents = $( event.target ).closest( '.ext-wikisource-ocr-onboarding-popup, .ext-wikisource-ocr-onboarding-dot' );
		if ( $parents.length === 0 && popup.isVisible() ) {
			popup.toggle( false );
		}
	} );

	// Add the dot and popup to this widget.
	this.$element = $( '<div>' )
		.addClass( 'ext-wikisource-ocr-onboarding' )
		.append( $pulsatingDot, popup.$element );
}

OO.inheritClass( OnboardingPopup, OO.ui.Widget );

/**
 * @param {Function} callback
 */
OnboardingPopup.prototype.setNextCloseAction = function ( callback ) {
	// Only register a next-action if the onboarding popup is not currently shown.
	// For example, if someone clicks the options button, gets the onboarding popup,
	// but then clicks the OCR button, we don't want to register another next-action.
	if ( this.popup.isVisible() ) {
		return;
	}
	this.nextCloseAction = callback;
};

OnboardingPopup.prototype.onPopupButtonClick = function () {
	// First run any close-action that's been registered.
	if ( this.nextCloseAction instanceof Function ) {
		this.nextCloseAction.call();
	}
	this.ocrTool.setShowOnboarding( false );
	this.$element.remove();
	this.popup.$element.remove();
};

module.exports = OnboardingPopup;
