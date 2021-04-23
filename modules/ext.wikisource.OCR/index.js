var OcrTool = require( './OcrTool.js' ),
	ExtractTextWidget = require( './ExtractTextWidget.js' ),
	toolUrl = mw.config.get( 'WikisourceOcrUrl' ),
	$prpImage = $( '.prp-page-image' ),
	extractTextWidget = new ExtractTextWidget( new OcrTool( toolUrl ), $prpImage );

// Add the OCR button to the UI.
if ( $prpImage.length > 0 ) {
	$prpImage.append( extractTextWidget.$element );
}
