var OcrTool = require( './OcrTool.js' ),
	ExtractTextWidget = require( './ExtractTextWidget.js' ),
	toolUrl = mw.config.get( 'WikisourceOcrUrl' ),
	$prpImage = $( '.prp-page-image' ),
	$wpTextbox1 = $( '#wpTextbox1' ),
	extractTextWidget = new ExtractTextWidget( new OcrTool( toolUrl ), $prpImage, $wpTextbox1 );

// Add the OCR button to the UI.
if ( $prpImage.length > 0 ) {
	$prpImage.after( extractTextWidget.$element );
}
