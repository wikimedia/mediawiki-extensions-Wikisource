var BulkOcrWidget = require( './BulkOcrWidget.js' );

function InitBulkOcr() {
	// Find all pagelist containers
	const pagelistContainers = document.querySelectorAll( '.prp-index-pagelist' );
	if ( pagelistContainers.length === 0 ) {
		return;
	}

	// Add bulk OCR widget to each pagelist container
	let ocrStartIndex = 0;
	pagelistContainers.forEach( ( pagelistContainer ) => {
		const pageCount = pagelistContainer.children.length;
		const bulkOcrWidget = new BulkOcrWidget( pageCount, ocrStartIndex );
		ocrStartIndex = ocrStartIndex + pageCount;

		// Insert the container above the pagelist container
		pagelistContainer.parentNode.insertBefore(
			bulkOcrWidget.container,
			pagelistContainer
		);
	} );
}

mw.hook( 'wikipage.content' ).add( InitBulkOcr );
