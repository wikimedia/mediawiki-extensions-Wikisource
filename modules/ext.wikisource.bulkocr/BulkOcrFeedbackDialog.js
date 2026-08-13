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
const BulkOcrFeedbackPageLayout = require( './BulkOcrFeedbackPageLayout.js' );

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

// dialog body bookletlayout with one BulkOcrFeedbackPageLayout per OCR page.
BulkOcrFeedbackDialog.prototype.initialize = function () {
	BulkOcrFeedbackDialog.super.prototype.initialize.apply( this, arguments );

	// Safety banner warning about the multi-page effect of Approve.
	const safetyBanner = new OO.ui.MessageWidget( {
		type: 'warning',
		label: mw.msg( 'wikisource-bulkocr-feedback-safety-banner' ),
		classes: [ 'ext-wikisource-bulkocr-feedback-safety-banner' ]
	} );

	this.booklet = new OO.ui.BookletLayout( {
		outlined: true,
		expanded: true,
		classes: [ 'ext-wikisource-bulkocr-feedback-booklet' ]
	} );

	// Sort page titles by page number so the sidebar always shows them in book order
	const pageTitles = Object.keys( this.ocrDictionary ).sort( ( a, b ) => {
		const numA = parseInt( a.slice( a.lastIndexOf( '/' ) + 1 ), 10 );
		const numB = parseInt( b.slice( b.lastIndexOf( '/' ) + 1 ), 10 );
		return numA - numB;
	} );

	const pages = pageTitles.map( ( pageTitle, index ) => {
		return new BulkOcrFeedbackPageLayout( pageTitle, {
			label: mw.msg( 'wikisource-bulkocr-feedback-page-label', index + 1 ),
			ocrText: this.ocrDictionary[ pageTitle ] || '',
			imageUrl: this.pageImageMap[ pageTitle ] || ''
		} );
	} );

	this.booklet.addPages( pages );
	// activates the first page as soon as the dialog opens.
	this.booklet.selectFirstSelectablePage();
	// Wrap banner and booklet in a flex column so the banner sits at the top.
	const $container = $( '<div>' )
		.addClass( 'ext-wikisource-bulkocr-feedback-container' )
		.append( safetyBanner.$element, this.booklet.$element );
	this.$body.append( $container );
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
