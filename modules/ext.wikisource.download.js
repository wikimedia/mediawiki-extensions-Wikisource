( function () {
	// Infuse the button.
	var downloadButton, DownloadDialog, downloadDialog,
		downloadButtonElement = document.querySelector( '.ext-wikisource-download-button' );
	if ( !downloadButtonElement ) {
		return;
	}
	downloadButton = OO.ui.infuse( downloadButtonElement );

	// Remove non-JS target link.
	downloadButton.setHref( null );
	downloadButton.setTitle( null );

	// Create dialog window.
	DownloadDialog = require( './ext.wikisource.DownloadDialog.js' );
	downloadDialog = new DownloadDialog( {
		wsExportUrl: downloadButton.getData().wsExportUrl
	} );
	OO.ui.getWindowManager().addWindows( [ downloadDialog ] );

	// Show the dialog when clicking the button.
	downloadButton.on( 'click', function () {
		OO.ui.getWindowManager().openWindow( downloadDialog );
	} );
}() );
