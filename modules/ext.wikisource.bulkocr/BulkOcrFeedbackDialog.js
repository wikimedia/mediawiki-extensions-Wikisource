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
	this.totalPages = config.totalPages || 0;
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

	// Indeterminate progress bar shown while OCR is still processing.
	this.progressBar = new OO.ui.ProgressBarWidget( {
		progress: false,
		classes: [ 'ext-wikisource-bulkocr-feedback-progress' ]
	} );

	// Booklet that will hold the pages once OCR results are ready.
	this.booklet = new OO.ui.BookletLayout( {
		outlined: true,
		expanded: true,
		classes: [ 'ext-wikisource-bulkocr-feedback-booklet' ]
	} );

	// Status message shown next to the progress bar while OCR runs.
	this.$progressLabel = $( '<div>' )
		.addClass( 'ext-wikisource-bulkocr-feedback-progress-label' )
		.text( mw.msg( 'wikisource-bulkocr-ocr-progress', 0, this.totalPages ) );

	// Status bar row progress label at the start and progress bar at the
	// end (left/right in LTR, flips for RTL)
	this.$statusBar = $( '<div>' )
		.addClass( 'ext-wikisource-bulkocr-feedback-statusbar' )
		.append( this.$progressLabel, this.progressBar.$element );

	this.$container = $( '<div>' )
		.addClass( 'ext-wikisource-bulkocr-feedback-container' )
		.append(
			safetyBanner.$element,
			this.$statusBar,
			this.booklet.$element
		);

	this.$body.append( this.$container );
	// Show the pending state immediately so the work is happening
	// while OCR runs. Stopped in finishProcessing.
	this.pushPending();

};
/**
 *Approve is disabled when the dialog opens it will enabled once results arrive.
 *
 * @inheritdoc
 */
BulkOcrFeedbackDialog.prototype.getSetupProcess = function ( data ) {
	return BulkOcrFeedbackDialog.super.prototype.getSetupProcess.call( this, data )
		.next( () => {
			const hasResults = Object.keys( this.ocrDictionary ).length > 0;
			this.actions.setAbilities( { approve: hasResults } );
		} );
};

/**
 * Update the progress label as pages are processed.
 *
 * @param {number} processed Number of pages processed so far
 * @param {number} total Total number of pages
 */
BulkOcrFeedbackDialog.prototype.updateProgress = function ( processed, total ) {
	if ( this.$progressLabel ) {
		this.$progressLabel.text(
			mw.msg( 'wikisource-bulkocr-ocr-progress', processed, total )
		);
	}
};

/**
 * Add a single page to the booklet as its OCR completes (streaming review).
 * The page is inserted at the correct position by page number so the sidebar
 * stays in book order even though OCR completes out of order. See T433174.
 *
 * @param {string} pageTitle
 * @param {string} ocrText
 * @param {string} imageUrl
 */
BulkOcrFeedbackDialog.prototype.addPage = function ( pageTitle, ocrText, imageUrl ) {
	this.ocrDictionary[ pageTitle ] = ocrText;
	this.pageImageMap[ pageTitle ] = imageUrl;

	const pageNumber = parseInt( pageTitle.slice( pageTitle.lastIndexOf( '/' ) + 1 ), 10 );

	// Keep our own sorted list of added page numbers to compute the insert index.
	if ( !this.addedPageNumbers ) {
		this.addedPageNumbers = [];
	}

	// Find where this page number belongs in the sorted list.
	let insertIndex = this.addedPageNumbers.length;
	for ( let i = 0; i < this.addedPageNumbers.length; i++ ) {
		if ( pageNumber < this.addedPageNumbers[ i ] ) {
			insertIndex = i;
			break;
		}
	}
	this.addedPageNumbers.splice( insertIndex, 0, pageNumber );

	const page = new BulkOcrFeedbackPageLayout( pageTitle, {
		label: mw.msg( 'wikisource-bulkocr-feedback-page-label', pageNumber ),
		ocrText: ocrText,
		imageUrl: imageUrl
	} );

	this.booklet.addPages( [ page ], insertIndex );

	// Select the first page as soon as one is available.
	if ( this.addedPageNumbers.length === 1 ) {
		this.booklet.selectFirstSelectablePage();
	}
};

/**
 * Called when all OCR processing has finished. Hides the progress bar and
 * enables Approve if at least one page was produced otherwise shows an
 * error state. See T433174.
 */
BulkOcrFeedbackDialog.prototype.finishProcessing = function () {
	this.popPending();
	this.$statusBar.hide();

	if ( Object.keys( this.ocrDictionary ).length === 0 ) {
		this.showError( mw.msg( 'wikisource-bulkocr-feedback-no-results' ) );
		return;
	}

	this.actions.setAbilities( { approve: true } );
};

/**
 * Show an error state inside the dialog when OCR produced no usable results.
 * The progress bar and booklet are hidden and Approve stays disabled.
 *
 * @param {string} message Error message to display
 */
BulkOcrFeedbackDialog.prototype.showError = function ( message ) {
	this.showErrors( [ new OO.ui.Error( message, { recoverable: false } ) ] );
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
