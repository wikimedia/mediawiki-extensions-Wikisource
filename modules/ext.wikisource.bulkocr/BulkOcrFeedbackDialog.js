/**
 * Dialog window that opens after Bulk OCR processing completes.
 *
 * Presents the OCR results to the user with the page image and the
 * transcribed text side by side so the user can confirm the quality
 * before the text is written to the wiki. Approve saves all pages,
 * Cancel discards everything.
 *
 * See T394131 for design context.
 *
 * @param {Object} config
 * @param {Object} config.ocrDictionary Map of page titles to OCR text
 * @param {Object} config.pageImageMap Map of page titles to image URLs
 * @param {Function} config.onApprove Called when the user clicks Approve
 * @class
 * @constructor
 */
function BulkOcrFeedbackDialog( config ) {
	BulkOcrFeedbackDialog.super.call( this, config );
	this.ocrDictionary = config.ocrDictionary || {};
	this.pageImageMap = config.pageImageMap || {};
	this.onApprove = config.onApprove;
}
OO.inheritClass( BulkOcrFeedbackDialog, OO.ui.ProcessDialog );
BulkOcrFeedbackDialog.static.name = 'BulkOcrFeedbackDialog';
BulkOcrFeedbackDialog.static.size = 'larger';
BulkOcrFeedbackDialog.static.title = OO.ui.deferMsg( 'wikisource-bulkocr-feedback-title' );
BulkOcrFeedbackDialog.static.actions = [
	{
		flags: [ 'primary', 'progressive' ],
		label: OO.ui.deferMsg( 'wikisource-bulkocr-feedback-approve' ),
		action: 'approve'
	},
	{
		flags: 'safe',
		label: OO.ui.deferMsg( 'wikisource-bulkocr-feedback-cancel' ),
		action: 'cancel'
	}
];
/**
 * show the image and text side by side.
 *
 * @inheritdoc
 */
BulkOcrFeedbackDialog.prototype.initialize = function () {
	BulkOcrFeedbackDialog.super.prototype.initialize.apply( this, arguments );
	this.content = new OO.ui.PanelLayout( { padded: true, expanded: false } );
	this.content.$element.addClass( 'ext-wikisource-bulkocr-feedback-dialog' );

	// One row per page: image on the left, OCR text on the right.
	Object.keys( this.ocrDictionary ).forEach( ( pageTitle ) => {
		this.content.$element.append( this.buildPageRow( pageTitle ) );
	} );
	this.$body.append( this.content.$element );
};

/**
 * Build a single row showing the page image and its OCR text side by side.
 *
 * @param {string} pageTitle
 * @return {jQuery}
 */
BulkOcrFeedbackDialog.prototype.buildPageRow = function ( pageTitle ) {
	const imageUrl = this.pageImageMap[ pageTitle ] || '';
	const ocrText = this.ocrDictionary[ pageTitle ] || '';
	const $imageCell = $( '<div>' )
		.addClass( 'ext-wikisource-bulkocr-feedback-image-cell' )
		.append(
			$( '<img>' )
				.attr( 'src', imageUrl )
				.attr( 'alt', pageTitle )
				.addClass( 'ext-wikisource-bulkocr-feedback-image' )
		);

	const $textCell = $( '<div>' )
		.addClass( 'ext-wikisource-bulkocr-feedback-text-cell' )
		.append(
			$( '<pre>' )
				.text( ocrText )
				.addClass( 'ext-wikisource-bulkocr-feedback-text' )
		);

	return $( '<div>' )
		.addClass( 'ext-wikisource-bulkocr-feedback-row' )
		.append( $textCell, $imageCell );
};

/**
 * Route dialog actions: Approve triggers the callback and Cancel just closes.
 *
 * @inheritdoc
 */
BulkOcrFeedbackDialog.prototype.getActionProcess = function ( action ) {
	if ( action === 'approve' ) {
		return new OO.ui.Process( () => {
			if ( typeof this.onApprove === 'function' ) {
				this.onApprove();
			}
			this.close( { action: action } );
		} );
	}
	if ( action === 'cancel' ) {
		return new OO.ui.Process( () => {
			this.close( { action: action } );
		} );
	}
	return BulkOcrFeedbackDialog.super.prototype.getActionProcess.call( this, action );
};
module.exports = BulkOcrFeedbackDialog;
