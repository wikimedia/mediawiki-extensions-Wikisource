class BulkOcrWidget {
	constructor( pageCount, ocrStartIndex ) {
		// Create the Bulk OCR button, Warning message, and UI Container
		const bulkOcrButton = new OO.ui.ButtonWidget( {
			icon: 'bulk-ocr',
			label: mw.msg( 'wikisource-bulkocr-button' ),
			classes: [ 'ext-wikisource-bulkocr-button' ]
		} );
		bulkOcrButton.$icon.addClass( 'ext-wikisource-icon-bulk-ocr' );

		const warningMessage = new OO.ui.MessageWidget( {
			type: 'warning',
			label: mw.msg( 'wikisource-bulkocr-active-development-warning' ),
			classes: [ 'ext-wikisource-bulkocr-warning' ]
		} );
		const container = document.createElement( 'div' );
		container.className = 'ext-wikisource-bulkocr-container';
		container.appendChild( bulkOcrButton.$element[ 0 ] );
		container.appendChild( warningMessage.$element[ 0 ] );
		bulkOcrButton.on( 'click', () => {
			this.executeBulkOcr();
		} );

		this.bulkOcrButton = bulkOcrButton;
		this.warningMessage = warningMessage;
		this.container = container;

		// Store individual widget-specific data
		this.pageCount = pageCount;
		this.ocrStartIndex = ocrStartIndex;
		this.ocrEndIndex = this.ocrStartIndex + this.pageCount;

		// Initialize state variables
		this.ocrDictionary = {}; // Maps page titles to OCR text
		this.selectedEngine = 'google'; // Default OCR engine
		this.selectedLanguageKey = 'eng'; // Default language
		this.mwApi = new mw.Api();

		// Create shared notification element
		this.progressNotificationElement = document.createElement( 'div' );
		this.progressNotificationId = null;

		// Set up event emitter
		this.events = $( {} );
	}

	/**
	 * Execute the bulk OCR process for untranscribed pages in the current Index namespace
	 * 1. Finds untranscribed pages in the current Index namespace
	 * 2. Retrieves images for those pages
	 * 3. Processes OCR on the images in batches
	 * 4. Saves the OCR results to the pages in batches
	 * 5. Refreshes the page when complete
	 */
	executeBulkOcr() {
		// Get the current Index URL title
		const title = mw.config.get( 'wgPageName' );
		if ( !title ) {
			return;
		}

		// Reset OCR dictionary
		this.ocrDictionary = {};

		// Reset event handlers
		this.events.off( 'ocr-pages-found ocr-images-loaded ocr-complete update-pages-complete' );

		// Handle when untranscribed pages are found
		this.events.on( 'ocr-pages-found', ( e, indexTitle, titlesArray ) => {
			this.getImagesForPages( indexTitle, titlesArray );
		} );

		// Handle when images are loaded
		this.events.on( 'ocr-images-loaded', ( e, pageImageMap ) => {
			// Process OCR in batches of 10
			this.processBatchedOcr( pageImageMap, 10 )
				.then( () => {
					this.events.trigger( 'ocr-complete' );
				} );
		} );

		// Handle when OCR processing is complete
		this.events.on( 'ocr-complete', () => {
			this.saveOcrResults();
		} );

		// Handle when page updates are complete
		this.events.on( 'update-pages-complete', () => {
			this.progressNotificationElement.textContent = mw.msg( 'wikisource-bulkocr-success-message' );

			this.progressNotificationId = mw.notify( $( this.progressNotificationElement ), {
				autoHide: true,
				autoHideSeconds: 30,
				type: 'success',
				tag: 'bulk-ocr-progress'
			} );

			this.updatePageListStatus();
		} );

		// Start the process
		this.getUnTranscribedPagesInIndex( title )
			.then( titlesArray => {
				if ( titlesArray.length === 0 ) {
					// Close shared notification element when no pages are found
					this.progressNotificationElement.textContent = mw.msg( 'wikisource-bulkocr-in-progress' );
					mw.notify( $( this.progressNotificationElement ), {
						autoHide: true,
						type: 'info',
						tag: 'bulk-ocr-progress'
					} );
					mw.notify( mw.msg( 'wikisource-bulkocr-no-pages-found' ), { type: 'error' } );
					return;
				}
				this.events.trigger( 'ocr-pages-found', [ title, titlesArray ] );
			} )
			.catch( error => {
				console.error( 'Error in bulk OCR process:', error );
			} );
	}

	/**
	 * Get UnTranscribed pages from Current Index namespace
	 *
	 * @param {string} indexTitle - The title of the index page
	 * @return {jQuery.Promise} - Promise resolving to array of untranscribed page titles
	 */
	getUnTranscribedPagesInIndex( indexTitle ) {
		const deferred = $.Deferred();

		this.progressNotificationElement.textContent = mw.msg( 'wikisource-bulkocr-in-progress' );

		this.progressNotificationId = mw.notify( $( this.progressNotificationElement ), {
			autoHide: false,
			type: 'info',
			tag: 'bulk-ocr-progress'
		} );

		this.mwApi.get( {
			action: 'query',
			list: 'proofreadpagesinindex',
			prppiititle: indexTitle,
			prppiiprop: 'ids|title|formattedpagenumber',
			formatversion: 2
		} ).done( ( response ) => {
			const unTranscribedPages = [];
			if ( response.query.proofreadpagesinindex ) {
				const allPages = response.query.proofreadpagesinindex;
				const currentPagelistPages = allPages.slice( this.ocrStartIndex, this.ocrEndIndex );

				// Collect uncreated pages (pageid === 0)
				currentPagelistPages.forEach( page => {
					if ( page.pageid === 0 ) {
						unTranscribedPages.push( page.title );
					}
				} );
			}
			deferred.resolve( unTranscribedPages );
		} ).fail( ( xhr, status, error ) => {
			mw.notify( mw.msg( 'wikisource-bulkocr-fetch-pages-failed' ), { type: 'error' } );
			deferred.reject( error || 'API request failed' );
		} );

		return deferred.promise();
	}

	/**
	 * Get images for pages in the index
	 *
	 * @param {string} indexTitle - The title of the index page
	 * @param {Array} titlesArray - Array of page titles to get images for
	 */
	getImagesForPages( indexTitle, titlesArray ) {
		const pageImageMap = {};

		this.mwApi.get( {
			action: 'query',
			prop: 'imageforpage',
			generator: 'proofreadpagesinindex',
			formatversion: 2,
			prppifpprop: 'filename|size|fullsize|responsiveimages',
			gprppiiprop: 'ids|title',
			gprppiititle: indexTitle,
			origin: '*'
		} ).done( ( imgResponse ) => {
			if ( imgResponse.query && imgResponse.query.pages ) {
				Object.values( imgResponse.query.pages ).forEach( page => {
					const pageTitle = page.title;
					// Remove already transcribed or non-empty pages
					if ( !titlesArray.includes( pageTitle ) ) {
						return;
					}
					const thumbnail = page.imagesforpage.thumbnail || '';
					// add image to dictionary
					if ( thumbnail ) {
						pageImageMap[ pageTitle ] = thumbnail;
					}
				} );
			}
			this.events.trigger( 'ocr-images-loaded', [ pageImageMap ] );
		} ).fail( ( xhr, status, error ) => {
			console.error( 'Image data fetch failed:', error );
			mw.notify( mw.msg( 'wikisource-bulkocr-fetch-images-failed' ), { type: 'error' } );
		} );
	}

	/**
	 * Process OCR for a single page
	 *
	 * @param {string} pageTitle - The title of the page
	 * @param {string} thumbnail - The thumbnail URL for the page
	 * @return {jQuery.Promise} - Promise resolving to the OCR text or null if failed
	 */
	processOcrForPage( pageTitle, thumbnail ) {
		const deferred = $.Deferred();
		const toolUrl = mw.config.get( 'WikisourceOcrUrl' );
		// Convert relative URLs to absolute URLs
		const imageUrl = thumbnail.startsWith( '/' ) && !thumbnail.startsWith( '//' ) ?
			mw.config.get( 'wgServer' ) + thumbnail :
			thumbnail;

		const ocrApiUrl = `${toolUrl}/api?engine=${this.selectedEngine}&image=${encodeURIComponent( imageUrl )}&langs%5B%5D=${this.selectedLanguageKey}`;

		$.ajax( {
			url: ocrApiUrl,
			dataType: 'json',
			success: ( ocrResponse ) => {
				if ( ocrResponse.text ) {
					deferred.resolve( ocrResponse.text );
				} else {
					deferred.resolve( null );
				}
			},
			error: ( xhr, status, error ) => {
				mw.notify( `Failed to process OCR for ${pageTitle}`, { type: 'error' } );
				console.error( `OCR failed for ${pageTitle}:`, error );
				deferred.reject( error );
			}
		} );

		return deferred.promise();
	}

	/**
	 * Process OCR for pages in batches
	 *
	 * @param {Object} pageImageMap - Map of page titles to thumbnail URLs
	 * @param {number} batchSize - Number of requests to process in each batch
	 * @return {jQuery.Promise} - Promise resolving when all batches are complete
	 */
	processBatchedOcr( pageImageMap, batchSize = 10 ) {
		const deferred = $.Deferred();
		const entries = Object.entries( pageImageMap );
		const totalPages = entries.length;
		let processedCount = 0;

		this.progressNotificationElement.textContent = mw.msg( 'wikisource-bulkocr-ocr-progress', 0, totalPages );

		// Show the notification if not already shown
		if ( !this.progressNotificationId ) {
			this.progressNotificationId = mw.notify( $( this.progressNotificationElement ), {
				autoHide: false,
				type: 'info',
				tag: 'bulk-ocr-progress'
			} );
		}

		const processBatch = ( startIndex ) => {
			const batch = entries.slice( startIndex, startIndex + batchSize );
			if ( batch.length === 0 ) {
				deferred.resolve();
				return;
			}

			const batchPromises = batch.map( ( [ pageTitle, thumbnail ] ) => {
				return this.processOcrForPage( pageTitle, thumbnail )
					.then( ocrText => {
						if ( ocrText ) {
							this.ocrDictionary[ pageTitle ] = ocrText;
						}
						processedCount++;
						// Update notification text
						this.progressNotificationElement.textContent = mw.msg( 'wikisource-bulkocr-ocr-progress', processedCount, totalPages );
						return ocrText;
					} );
			} );

			$.when.apply( $, batchPromises )
				.always( () => {
					// Process next batch after a short delay to avoid rate limiting
					setTimeout( () => {
						processBatch( startIndex + batchSize );
					}, 1000 );
				} );
		};

		// Start processing the first batch
		processBatch( 0 );

		return deferred.promise();
	}

	/**
	 * Save OCR results to pages in batches
	 *
	 * @param {number} batchSize - Number of saves to process in each batch
	 */
	saveOcrResults( batchSize = 10 ) {
		const entries = Object.entries( this.ocrDictionary );
		const totalEntries = entries.length;
		let savedCount = 0;
		let failedPages = [];

		// Update shared notification element
		this.progressNotificationElement.textContent = mw.msg( 'wikisource-bulkocr-saving-progress', 0, totalEntries );

		const saveBatch = ( startIndex ) => {
			const batch = entries.slice( startIndex, startIndex + batchSize );
			if ( batch.length === 0 ) {
				this.events.trigger( 'update-pages-complete' );
				return;
			}

			let batchPendingSaves = batch.length;

			batch.forEach( ( [ pageTitle, text ] ) => {
				this.mwApi.postWithToken( 'csrf', {
					action: 'edit',
					title: pageTitle,
					appendtext: text, // Append OCR text to page
					createonly: 1, // Only create new pages, don't overwrite existing content
					format: 'json'
				} ).done( () => {
					savedCount++;
					// Update notification text
					this.progressNotificationElement.textContent = mw.msg( 'wikisource-bulkocr-saving-progress', savedCount, totalEntries );
					if ( failedPages.length > 0 ) {
						this.progressNotificationElement.textContent = mw.msg( 'wikisource-bulkocr-saving-progress-with-failures', savedCount, totalEntries, failedPages.join( ', ' ) );
					}

					batchPendingSaves--;
					if ( batchPendingSaves === 0 ) {
						// Process next batch after a short delay
						setTimeout( () => {
							saveBatch( startIndex + batchSize );
						}, 1000 );
					}
				} ).fail( ( error ) => {
					console.error( `Edit failed for ${pageTitle}:`, error );
					failedPages.push( pageTitle );

					// Update notification to show failure
					this.progressNotificationElement.textContent = mw.msg( 'wikisource-bulkocr-saving-progress-with-failures', savedCount, totalEntries, failedPages.join( ', ' ) );

					batchPendingSaves--;
					if ( batchPendingSaves === 0 ) {
						// Process next batch after a short delay
						setTimeout( () => {
							saveBatch( startIndex + batchSize );
						}, 1000 );
					}
				} );
			} );
		};

		// Start saving the first batch
		saveBatch( 0 );
	}

	/**
	 * Live Updates pageList links from "page does not exist"
	 * status to "not proofread" status by updating CSS classes.
	 */
	updatePageListStatus() {
		// Update pagelist links to show 'not proofread' status
		Object.keys( this.ocrDictionary ).forEach( pageTitle => {
			const pageLink = document.querySelector( `a[title="${pageTitle} (page does not exist)"]` );
			if ( pageLink ) {
				pageLink.classList.remove( 'new' );
				pageLink.classList.add( 'prp-pagequality-1', 'quality1' );
			}
		} );
	}

}

module.exports = BulkOcrWidget;
