/**
 * The dialog window that pops up when the Download button is clicked.
 *
 * @param {Object} config
 * @class
 * @constructor
 */
function DownloadDialog( config ) {
	DownloadDialog.super.call( this, config );
	this.wsExportUrl = config.wsExportUrl;
}

OO.inheritClass( DownloadDialog, OO.ui.ProcessDialog );

DownloadDialog.static.size = 'small';
DownloadDialog.static.name = 'WikisourceDownload';
DownloadDialog.static.title = OO.ui.deferMsg( 'wikisource-download-chooser-title' );
DownloadDialog.static.actions = [
	{ flags: 'safe', icon: 'close', action: 'close' }
];

DownloadDialog.prototype.getBodyHeight = function () {
	return this.content.$element.outerHeight( true );
};

DownloadDialog.prototype.initialize = function () {
	var epubButton, mobiButton, pdfButton,
		ChooserButton = require( './ext.wikisource.ChooserButton.js' );
	DownloadDialog.super.prototype.initialize.apply( this, arguments );

	epubButton = new ChooserButton( { wsExportUrl: this.wsExportUrl, icon: 'laptop-and-mobile', format: 'epub' } );
	mobiButton = new ChooserButton( { wsExportUrl: this.wsExportUrl, icon: 'tablet', format: 'mobi' } );
	pdfButton = new ChooserButton( { wsExportUrl: this.wsExportUrl, icon: 'desktop-and-printer', format: 'pdf' } );

	this.content = new OO.ui.PanelLayout( { padded: false, expanded: false } );
	this.content.$element.append( epubButton.$element, mobiButton.$element, pdfButton.$element );

	this.$body.append( this.content.$element );
};

DownloadDialog.prototype.getActionProcess = function ( action ) {
	var dialog = this;
	if ( action === 'close' ) {
		return new OO.ui.Process( function () {
			dialog.close( { action: action } );
		} );
	}
	return DownloadDialog.super.prototype.getActionProcess.call( this, action );
};

module.exports = DownloadDialog;
