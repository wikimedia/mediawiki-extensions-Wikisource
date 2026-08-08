/**
 * A single reviewable page inside the Bulk OCR feedback dialog.
 *
 * Renders the OCR text and the original page image side by side, and
 * appears as one page in the dialog's BookletLayout sidebar.
 *
 * See T394131 for design context.
 *
 * @param {string} name Page title, used as the unique BookletLayout key
 * @param {Object} config
 * @param {string} config.label Sidebar label
 * @param {string} config.ocrText OCR text for this page
 * @param {string} config.imageUrl Image URL for this page
 * @class
 * @constructor
 * @extends OO.ui.PageLayout
 */
function BulkOcrFeedbackPageLayout( name, config ) {
	BulkOcrFeedbackPageLayout.super.call( this, name, config );

	this.label = config.label;

	const $textCell = $( '<div>' )
		.addClass( 'ext-wikisource-bulkocr-feedback-text-cell' )
		.append(
			$( '<pre>' )
				.text( config.ocrText )
				.addClass( 'ext-wikisource-bulkocr-feedback-text' )
		);

	const $imageCell = $( '<div>' )
		.addClass( 'ext-wikisource-bulkocr-feedback-image-cell' )
		.append(
			$( '<img>' )
				.attr( 'src', config.imageUrl )
				.attr( 'alt', name )
				.addClass( 'ext-wikisource-bulkocr-feedback-image' )
		);

	// Wrap the flex row in an inner div so BookletLayout can freely show and
	// hide the page without the layout CSS interfering.
	const $inner = $( '<div>' )
		.addClass( 'ext-wikisource-bulkocr-feedback-row' )
		.append( $textCell, $imageCell );

	this.$element.append( $inner );
}
OO.inheritClass( BulkOcrFeedbackPageLayout, OO.ui.PageLayout );

BulkOcrFeedbackPageLayout.prototype.setupOutlineItem = function () {
	this.outlineItem.setLabel( this.label );
};

module.exports = BulkOcrFeedbackPageLayout;
