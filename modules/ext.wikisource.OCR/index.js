var OcrTool = require( './OcrTool.js' ),
	ExtractTextWidget = require( './ExtractTextWidget.js' ),
	toolUrl = mw.config.get( 'WikisourceOcrUrl' ),
	$prpImage = $( '.prp-page-image' ),
	$wpTextbox1 = $( '#wpTextbox1' ),
	extractTextWidget = new ExtractTextWidget( new OcrTool( toolUrl ), $prpImage, $wpTextbox1 );

// Guard against the unlikely situation of there not being an image.
if ( $prpImage.length === 0 ) {
	return;
}

// Add the 'Extract text' button to the WikiEditor toolbar.
$.when( mw.loader.using( 'ext.wikiEditor' ), $.ready ).then( function () {
	$( '.wikiEditor-ui-toolbar .section-main' ).after( extractTextWidget.$element );
} );
