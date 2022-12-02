var OcrTool = require( './OcrTool.js' ),
	ExtractTextWidget = require( './ExtractTextWidget.js' ),
	toolUrl = mw.config.get( 'WikisourceOcrUrl' ),
	$prpImage = $( '.prp-page-image' ),
	$wpTextbox1 = $( '#wpTextbox1' );

if ( $prpImage.length === 0 ) {
	return;
}

var extractTextWidget = new ExtractTextWidget(
	new OcrTool( toolUrl, $prpImage.find( 'img' )[ 0 ].src ), $wpTextbox1 );

if ( mw.proofreadpage && mw.proofreadpage.openseadragon ) {
	extractTextWidget.setOSDInstance( mw.proofreadpage.openseadragon );
} else {
	mw.hook( 'ext.proofreadpage.osd-controller-available' ).add( function () {
		extractTextWidget.setOSDInstance( mw.proofreadpage.openseadragon );
	} );
}

// Add the 'Extract text' button to the WikiEditor toolbar.
mw.hook( 'wikiEditor.toolbarReady' ).add( function () {
	$( '.wikiEditor-ui-toolbar .section-main' )
		.after( extractTextWidget.$element );
} );
