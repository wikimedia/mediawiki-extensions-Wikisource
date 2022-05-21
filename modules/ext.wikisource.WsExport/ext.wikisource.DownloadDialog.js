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
	var lang, serverName, url, epubButton, mobiButton, pdfButton,
		$otherFormatLabel, $otherFormatsLink,
		ChooserButton = require( './ext.wikisource.ChooserButton.js' );
	DownloadDialog.super.prototype.initialize.apply( this, arguments );

	// Get the subdomain (language code). This duplicates what's done in PHP in the WsExport class.
	// It's repeated here to avoid having another JS config variable passed to the frontend.
	lang = mw.config.get( 'wgContentLanguage' );
	serverName = mw.config.get( 'wgServerName' );
	if ( serverName === 'wikisource.org' ) {
		lang = 'mul';
	} else if ( serverName.includes( 'en.wikisource.beta' ) ) {
		lang = 'beta';
	} else if ( serverName.includes( '.wikisource.org' ) ) {
		lang = serverName.slice( 0, Math.max( 0, serverName.indexOf( '.wikisource.org' ) ) );
	}

	// @TODO Use URL() here when it's permitted in MediaWiki.
	url = this.wsExportUrl +
		'?lang=' + lang +
		'&title=' + encodeURIComponent( mw.config.get( 'wgPageName' ) );

	epubButton = new ChooserButton( { wsExportUrl: this.wsExportUrl, icon: 'laptop-and-mobile', format: 'epub', lang: lang } );
	mobiButton = new ChooserButton( { wsExportUrl: this.wsExportUrl, icon: 'tablet', format: 'mobi', lang: lang } );
	pdfButton = new ChooserButton( { wsExportUrl: this.wsExportUrl, icon: 'desktop-and-printer', format: 'pdf', lang: lang } );

	$otherFormatLabel = $( '<span>' )
		.addClass( 'ext-wikisource-other-format-label ext-wikisource-subtle-text' )
		.text( mw.msg( 'wikisource-download-chooser-different-format' ) );
	$otherFormatsLink = $( '<a>' )
		.attr( 'href', url )
		.attr( 'target', '_blank' )
		.attr( 'class', 'ext-wikisource-other-format-link' );
	$otherFormatsLink.append( $( '<span class="ext-wikisource-left-space">' ) );
	$otherFormatsLink.append( $otherFormatLabel );

	this.content = new OO.ui.PanelLayout( { padded: false, expanded: false } );
	this.content.$element.addClass( 'ext-wikisource-download-dialog' );
	this.content.$element.append(
		epubButton.$element,
		mobiButton.$element,
		pdfButton.$element,
		$otherFormatsLink
	);

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
