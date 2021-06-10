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
	const $pulsatingDot = $( '<a>' ).addClass( 'mw-pulsating-dot' );

	// Popup.
	const $popupContent = $( '<div>' ).append(
		$( '<div>' ).addClass( 'ext-wikisource-ocr-onboarding-image' ),
		$( '<h3>' ).text( mw.msg( 'wikisource-ocr-onboarding-title' ) ),
		$( '<p>' ).text( mw.msg( 'wikisource-ocr-onboarding-text' ) ),
		$( '<div>' ).addClass( 'ext-wikisource-ocr-onboarding-button' )
			.append( okayButton.$element )
	);
	const popup = new OO.ui.PopupWidget( {
		$floatableContainer: $pulsatingDot,
		$content: $popupContent,
		padded: true,
		width: 300,
		align: 'backwards'
	} );

	// Toggle the popup when the dot is clicked.
	$pulsatingDot.on( 'click', function () {
		popup.toggle();
	} );
	// Close the popup when clicking anywhere outside it or the dot.
	$( 'html' ).on( 'click', function ( event ) {
		if ( $( event.target ).closest( '.ext-wikisource-ocr-onboarding' ).length === 0 && popup.isVisible() ) {
			popup.toggle( false );
		}
	} );

	// Add all to this widget.
	this.$element = $( '<div>' )
		.addClass( 'ext-wikisource-ocr-onboarding' )
		.append( $pulsatingDot, popup.$element );
}

OO.inheritClass( OnboardingPopup, OO.ui.Widget );

OnboardingPopup.prototype.onPopupButtonClick = function () {
	this.ocrTool.setShowOnboarding( false );
	this.$element.remove();
};

module.exports = OnboardingPopup;
