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
BulkOcrFeedbackDialog.static.size = 'full';
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
 * A single reviewable page inside the feedback dialog.
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
function FeedbackPageLayout( name, config ) {
	FeedbackPageLayout.super.call( this, name, config );

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

	// Wrap the flex layout in an inner div so BookletLayout can freely
	const $inner = $( '<div>' )
		.addClass( 'ext-wikisource-bulkocr-feedback-row' )
		.append( $textCell, $imageCell );

	this.$element.append( $inner );
}
OO.inheritClass( FeedbackPageLayout, OO.ui.PageLayout );

FeedbackPageLayout.prototype.setupOutlineItem = function () {
	this.outlineItem.setLabel( this.label );
};

// dialog body bookletlayout with one FeedbackPageLayout per OCR page.
BulkOcrFeedbackDialog.prototype.initialize = function () {
	BulkOcrFeedbackDialog.super.prototype.initialize.apply( this, arguments );

	this.booklet = new OO.ui.BookletLayout( {
		outlined: true,
		expanded: true
	} );

	// Sort page titles by page number so the sidebar always shows them in book order
	const pageTitles = Object.keys( this.ocrDictionary ).sort( ( a, b ) => {
		const numA = parseInt( a.slice( a.lastIndexOf( '/' ) + 1 ), 10 );
		const numB = parseInt( b.slice( b.lastIndexOf( '/' ) + 1 ), 10 );
		return numA - numB;
	} );

	const pages = pageTitles.map( ( pageTitle, index ) => {
		return new FeedbackPageLayout( pageTitle, {
			label: mw.msg( 'wikisource-bulkocr-feedback-page-label', index + 1 ),
			ocrText: this.ocrDictionary[ pageTitle ] || '',
			imageUrl: this.pageImageMap[ pageTitle ] || ''
		} );
	} );

	this.booklet.addPages( pages );
	// activates the first page as soon as the dialog opens.
	this.booklet.selectFirstSelectablePage();

	this.$body.append( this.booklet.$element );
};

/**
 * The ProcessDialog body needs an explicit height when it wraps a
 * BookletLayout, following the pattern used in mw.Upload.Dialog.
 *
 * @inheritdoc
 */
BulkOcrFeedbackDialog.prototype.getBodyHeight = function () {
	return 600;
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
