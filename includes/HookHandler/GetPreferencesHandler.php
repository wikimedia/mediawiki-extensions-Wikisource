<?php

namespace MediaWiki\Extension\Wikisource\HookHandler;

use MediaWiki\Preferences\Hook\GetPreferencesHook;
use MediaWiki\User\User;

class GetPreferencesHandler implements GetPreferencesHook {

	/**
	 * Handle the GetPreferences hook.
	 * @param User $user
	 * @param array &$preferences
	 */
	public function onGetPreferences( $user, &$preferences ) {
		$preferences['wikisource-ocr'] = [
			'type' => 'api'
		];
	}
}
