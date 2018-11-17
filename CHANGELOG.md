<a name="1.58.1"></a>
## <small>1.58.1 (2018-11-17)</small>

* Fix: Better error message for file of unknown type (#862) ([d46e8ff](https://github.com/box/box-content-preview/commit/d46e8ff)), closes [#862](https://github.com/box/box-content-preview/issues/862)
* Fix: Downgrade annotations to 2.3.0 ([4904408](https://github.com/box/box-content-preview/commit/4904408))



<a name="1.58.0"></a>
## 1.58.0 (2018-11-13)

* Update: box-annotations to v3.2.0 (#863) ([18b7832](https://github.com/box/box-content-preview/commit/18b7832)), closes [#863](https://github.com/box/box-content-preview/issues/863)
* New: Enable PDF Signatures in PDF.js (#853) ([15fc355](https://github.com/box/box-content-preview/commit/15fc355)), closes [#853](https://github.com/box/box-content-preview/issues/853)



<a name="1.57.0"></a>
## 1.57.0 (2018-11-07)

* Chore: Remove outline from preview container (#860) ([5d9415e](https://github.com/box/box-content-preview/commit/5d9415e)), closes [#860](https://github.com/box/box-content-preview/issues/860)
* Update: box-annotations to v3.1.0 (#859) ([64c5806](https://github.com/box/box-content-preview/commit/64c5806)), closes [#859](https://github.com/box/box-content-preview/issues/859)
* Fix: Add tabindex to preview container (#858) ([a37fdb7](https://github.com/box/box-content-preview/commit/a37fdb7)), closes [#858](https://github.com/box/box-content-preview/issues/858)



<a name="1.56.0"></a>
## 1.56.0 (2018-10-31)

* Chore: Add test to check PDFjs headers to avoid preflight (#855) ([d8077f5](https://github.com/box/box-content-preview/commit/d8077f5)), closes [#855](https://github.com/box/box-content-preview/issues/855)
* Chore: Enable PDF signatures in future builds of PDF.js (#852) ([4d61afa](https://github.com/box/box-content-preview/commit/4d61afa)), closes [#852](https://github.com/box/box-content-preview/issues/852)
* Chore: Upgrade Box Annotations to v3.0.0 (#856) ([3d4bd9e](https://github.com/box/box-content-preview/commit/3d4bd9e)), closes [#856](https://github.com/box/box-content-preview/issues/856)
* Fix: Prevent extra multi image page padding added by preview consumers (#854) ([3f8ee16](https://github.com/box/box-content-preview/commit/3f8ee16)), closes [#854](https://github.com/box/box-content-preview/issues/854)



<a name="1.55.0"></a>
## 1.55.0 (2018-10-16)

* Update: box-annotations to v2.3.0 (#851) ([ed4d81e](https://github.com/box/box-content-preview/commit/ed4d81e)), closes [#851](https://github.com/box/box-content-preview/issues/851)
* Fix: Adding annotations back to MultiImageViewer (#847) ([6e0ecb0](https://github.com/box/box-content-preview/commit/6e0ecb0)), closes [#847](https://github.com/box/box-content-preview/issues/847)
* Fix: Pass shaka data to error detail so it can be logged (#848) ([8fdd344](https://github.com/box/box-content-preview/commit/8fdd344)), closes [#848](https://github.com/box/box-content-preview/issues/848)
* Fix: resize preload in document viewer (#850) ([d29afa6](https://github.com/box/box-content-preview/commit/d29afa6)), closes [#850](https://github.com/box/box-content-preview/issues/850)



<a name="1.54.0"></a>
## 1.54.0 (2018-10-09)

* Chore: Moving header into container (#849) ([9528761](https://github.com/box/box-content-preview/commit/9528761)), closes [#849](https://github.com/box/box-content-preview/issues/849)
* Update: adding the headerElement option to Preview.show (#846) ([70eae04](https://github.com/box/box-content-preview/commit/70eae04)), closes [#846](https://github.com/box/box-content-preview/issues/846)
* New: Add gzip encoding param to pdf reps (#845) ([5137a01](https://github.com/box/box-content-preview/commit/5137a01)), closes [#845](https://github.com/box/box-content-preview/issues/845)
* Fix: Check to see if viewers want to show annotations (#843) ([2aa9914](https://github.com/box/box-content-preview/commit/2aa9914)), closes [#843](https://github.com/box/box-content-preview/issues/843)



<a name="1.53.0"></a>
## 1.53.0 (2018-09-18)

* Fix: init annotations after file rep is fetched (#842) ([20cc3c5](https://github.com/box/box-content-preview/commit/20cc3c5)), closes [#842](https://github.com/box/box-content-preview/issues/842)



<a name="1.52.0"></a>
## 1.52.0 (2018-09-11)

* Chore: remove x-box-accept-encoding header to prevent OPTIONS call (#841) ([8ebf984](https://github.com/box/box-content-preview/commit/8ebf984)), closes [#841](https://github.com/box/box-content-preview/issues/841)



<a name="1.51.0"></a>
## 1.51.0 (2018-09-04)

* Mojito: Update translations (#830) ([bdb45e9](https://github.com/box/box-content-preview/commit/bdb45e9)), closes [#830](https://github.com/box/box-content-preview/issues/830)
* Fix: add min-width to video (#839) ([b655d90](https://github.com/box/box-content-preview/commit/b655d90)), closes [#839](https://github.com/box/box-content-preview/issues/839)
* Fix: navigation buttons shouldn't cover scrollbar (#838) ([55b4d8e](https://github.com/box/box-content-preview/commit/55b4d8e)), closes [#838](https://github.com/box/box-content-preview/issues/838)
* Chore: Allow load metrics emission without file info (#828) ([863be29](https://github.com/box/box-content-preview/commit/863be29)), closes [#828](https://github.com/box/box-content-preview/issues/828)
* New: Adding NodeJS version check to Release script (#834) ([f28558c](https://github.com/box/box-content-preview/commit/f28558c)), closes [#834](https://github.com/box/box-content-preview/issues/834)



<a name="1.50.0"></a>
## 1.50.0 (2018-08-28)

* Chore: Adding find bar metrics (#835) ([15f6984](https://github.com/box/box-content-preview/commit/15f6984)), closes [#835](https://github.com/box/box-content-preview/issues/835)
* Fix: Preview should not auto focus itself unless told to do so (#833) ([d5ce4ef](https://github.com/box/box-content-preview/commit/d5ce4ef)), closes [#833](https://github.com/box/box-content-preview/issues/833)



<a name="1.49.0"></a>
## 1.49.0 (2018-08-21)

* Revert "Release: 1.49.0" (#831) ([acb4523](https://github.com/box/box-content-preview/commit/acb4523)), closes [#831](https://github.com/box/box-content-preview/issues/831)
* Revert "Release: 1.49.0" (#832) ([9bcf3c0](https://github.com/box/box-content-preview/commit/9bcf3c0)), closes [#832](https://github.com/box/box-content-preview/issues/832)
* Release: 1.49.0 ([32e2c1d](https://github.com/box/box-content-preview/commit/32e2c1d))
* Release: 1.49.0 ([47cf6f4](https://github.com/box/box-content-preview/commit/47cf6f4))
* Fix: Display correct error when handling an asset error (#829) ([2f70273](https://github.com/box/box-content-preview/commit/2f70273)), closes [#829](https://github.com/box/box-content-preview/issues/829)



<a name="1.48.0"></a>
## 1.48.0 (2018-07-26)

* Chore: Support auto captions in legacy and edited captions (#825) ([7b23933](https://github.com/box/box-content-preview/commit/7b23933)), closes [#825](https://github.com/box/box-content-preview/issues/825)
* Fix: Fix scenario where skills are present with no transcript (#824) ([26b8c9b](https://github.com/box/box-content-preview/commit/26b8c9b)), closes [#824](https://github.com/box/box-content-preview/issues/824)



<a name="1.47.0"></a>
## 1.47.0 (2018-07-18)

* Revert "Release: 1.47.0" (#822) ([b4fd3ac](https://github.com/box/box-content-preview/commit/b4fd3ac)), closes [#822](https://github.com/box/box-content-preview/issues/822)
* Revert "Upgrade: packages (#813)" (#823) ([b3f1421](https://github.com/box/box-content-preview/commit/b3f1421)), closes [#813](https://github.com/box/box-content-preview/issues/813) [#823](https://github.com/box/box-content-preview/issues/823)
* Release: 1.47.0 ([2953369](https://github.com/box/box-content-preview/commit/2953369))
* Mojito: Update translations (#812) ([f557e5e](https://github.com/box/box-content-preview/commit/f557e5e)), closes [#812](https://github.com/box/box-content-preview/issues/812)
* Mojito: Update translations (#818) ([6a17036](https://github.com/box/box-content-preview/commit/6a17036)), closes [#818](https://github.com/box/box-content-preview/issues/818)
* Mojito: Update translations (#821) ([f8a5205](https://github.com/box/box-content-preview/commit/f8a5205)), closes [#821](https://github.com/box/box-content-preview/issues/821)
* Fix: Downgrade optimize-css-assets-webpack-plugin package (#819) ([a3391a9](https://github.com/box/box-content-preview/commit/a3391a9)), closes [#819](https://github.com/box/box-content-preview/issues/819)
* Fix: Flaky ImageViewer test (#811) ([7ac4797](https://github.com/box/box-content-preview/commit/7ac4797)), closes [#811](https://github.com/box/box-content-preview/issues/811)
* New: Auto-generated captions (#816) ([a5cd36f](https://github.com/box/box-content-preview/commit/a5cd36f)), closes [#816](https://github.com/box/box-content-preview/issues/816)
* Build: Hide rsync file list (#815) ([e1e4b57](https://github.com/box/box-content-preview/commit/e1e4b57)), closes [#815](https://github.com/box/box-content-preview/issues/815)
* Upgrade: packages (#813) ([d865b59](https://github.com/box/box-content-preview/commit/d865b59)), closes [#813](https://github.com/box/box-content-preview/issues/813)



<a name="1.46.0"></a>
## 1.46.0 (2018-06-20)

* Fix: Retry logic (#808) ([906d47a](https://github.com/box/box-content-preview/commit/906d47a)), closes [#808](https://github.com/box/box-content-preview/issues/808)
* Add docs for token generator function (#807) ([8791f4e](https://github.com/box/box-content-preview/commit/8791f4e)), closes [#807](https://github.com/box/box-content-preview/issues/807)
* Update README.md ([35b2462](https://github.com/box/box-content-preview/commit/35b2462))
* Mojito: Update translations (#806) ([18b5fde](https://github.com/box/box-content-preview/commit/18b5fde)), closes [#806](https://github.com/box/box-content-preview/issues/806)
* Mojito: Update translations (#809) ([2a83b31](https://github.com/box/box-content-preview/commit/2a83b31)), closes [#809](https://github.com/box/box-content-preview/issues/809)



<a name="1.45.0"></a>
## 1.45.0 (2018-06-05)

* Update: box-annotations to v2.2.0 (#804) ([bc61f9f](https://github.com/box/box-content-preview/commit/bc61f9f)), closes [#804](https://github.com/box/box-content-preview/issues/804)
* Fix: Preview well-formed file in offline (fixes #793) (#799) ([fac6e9c](https://github.com/box/box-content-preview/commit/fac6e9c)), closes [#793](https://github.com/box/box-content-preview/issues/793) [#799](https://github.com/box/box-content-preview/issues/799) [#793](https://github.com/box/box-content-preview/issues/793)
* Fix: Show file undownloadable error for cached previews (#802) ([29318d8](https://github.com/box/box-content-preview/commit/29318d8)), closes [#802](https://github.com/box/box-content-preview/issues/802)
* Fix: video controls are cut off (#801) ([bab0c98](https://github.com/box/box-content-preview/commit/bab0c98)), closes [#801](https://github.com/box/box-content-preview/issues/801)
* Chore: update codeceptjs dependencies (#795) ([78daa71](https://github.com/box/box-content-preview/commit/78daa71)), closes [#795](https://github.com/box/box-content-preview/issues/795)



<a name="1.44.0"></a>
## 1.44.0 (2018-05-29)

* Update: box-annotations to v2.0.1 (#798) ([20023dc](https://github.com/box/box-content-preview/commit/20023dc)), closes [#798](https://github.com/box/box-content-preview/issues/798)
* Update: box-annotations to v2.1.0 (#803) ([0826bf9](https://github.com/box/box-content-preview/commit/0826bf9)), closes [#803](https://github.com/box/box-content-preview/issues/803)
* Fix: Add HEIC to image icon list (#800) ([736966e](https://github.com/box/box-content-preview/commit/736966e)), closes [#800](https://github.com/box/box-content-preview/issues/800)



<a name="1.43.0"></a>
## 1.43.0 (2018-05-15)

* New: Enable HEIC preview (#796) ([b80833a](https://github.com/box/box-content-preview/commit/b80833a)), closes [#796](https://github.com/box/box-content-preview/issues/796)
* Update: box-annotations to v2.0.0 (#797) ([678bd85](https://github.com/box/box-content-preview/commit/678bd85)), closes [#797](https://github.com/box/box-content-preview/issues/797)
* Chore: Move access token to environment variable (#785) ([2f446cc](https://github.com/box/box-content-preview/commit/2f446cc)), closes [#785](https://github.com/box/box-content-preview/issues/785)
* Chore: Update issue templates (#791) ([a5533cc](https://github.com/box/box-content-preview/commit/a5533cc)), closes [#791](https://github.com/box/box-content-preview/issues/791)
* Update issue templates (#792) ([2124b3c](https://github.com/box/box-content-preview/commit/2124b3c)), closes [#792](https://github.com/box/box-content-preview/issues/792)
* Fix: Correct media settings checkmark icon color on hover (#790) ([708082a](https://github.com/box/box-content-preview/commit/708082a)), closes [#790](https://github.com/box/box-content-preview/issues/790)



<a name="1.42.0"></a>
## 1.42.0 (2018-05-01)

* Update: box-annotations to v1.6.0 (#789) ([f3ea47c](https://github.com/box/box-content-preview/commit/f3ea47c)), closes [#789](https://github.com/box/box-content-preview/issues/789)
* Fix: Embedded notes in Box WebApp (#788) ([223c0b8](https://github.com/box/box-content-preview/commit/223c0b8)), closes [#788](https://github.com/box/box-content-preview/issues/788)
* Fix: Guard session/local storage usage in download reachability (#784) ([65ec0b5](https://github.com/box/box-content-preview/commit/65ec0b5)), closes [#784](https://github.com/box/box-content-preview/issues/784)
* Chore: Adding preview end and download attempt metrics (#781) ([8166c25](https://github.com/box/box-content-preview/commit/8166c25)), closes [#781](https://github.com/box/box-content-preview/issues/781)
* Chore: Round timer values to integers (#786) ([740181c](https://github.com/box/box-content-preview/commit/740181c)), closes [#786](https://github.com/box/box-content-preview/issues/786)



<a name="1.41.0"></a>
## 1.41.0 (2018-04-24)

* Update: box-annotations to v1.5.0 (#783) ([097fe86](https://github.com/box/box-content-preview/commit/097fe86)), closes [#783](https://github.com/box/box-content-preview/issues/783)
* Chore: build tweaks to remove stages to speed up cron (#766) ([5de7093](https://github.com/box/box-content-preview/commit/5de7093)), closes [#766](https://github.com/box/box-content-preview/issues/766)
* Chore: functional test running tweaks (#767) ([c3ea1e6](https://github.com/box/box-content-preview/commit/c3ea1e6)), closes [#767](https://github.com/box/box-content-preview/issues/767)
* Chore: improve functional test reliability by unhiding controls (#777) ([67d8e8c](https://github.com/box/box-content-preview/commit/67d8e8c)), closes [#777](https://github.com/box/box-content-preview/issues/777)
* Chore: Refactor functional tests (#774) ([10d7cba](https://github.com/box/box-content-preview/commit/10d7cba)), closes [#774](https://github.com/box/box-content-preview/issues/774)
* Chore: Refactor Timer to allow a reset of multiple tags (#778) ([4f2f577](https://github.com/box/box-content-preview/commit/4f2f577)), closes [#778](https://github.com/box/box-content-preview/issues/778)
* Chore: update timeouts for saucelabs for hanging builds (#780) ([95f9fd4](https://github.com/box/box-content-preview/commit/95f9fd4)), closes [#780](https://github.com/box/box-content-preview/issues/780)
* Fix: .bp-page-num-input CSS (#779) ([31265d8](https://github.com/box/box-content-preview/commit/31265d8)), closes [#779](https://github.com/box/box-content-preview/issues/779)
* New: Navigation arrows now remain visible when focused (#775) ([6f4af87](https://github.com/box/box-content-preview/commit/6f4af87)), closes [#775](https://github.com/box/box-content-preview/issues/775)



<a name="1.40.0"></a>
## 1.40.0 (2018-04-17)

* Update: box-annotations to v1.3.1 (#765) ([60e2af4](https://github.com/box/box-content-preview/commit/60e2af4)), closes [#765](https://github.com/box/box-content-preview/issues/765)
* Update: box-annotations to v1.4.0 (#776) ([d72f75c](https://github.com/box/box-content-preview/commit/d72f75c)), closes [#776](https://github.com/box/box-content-preview/issues/776)
* Chore: Add rep_type to logs (#773) ([5142e45](https://github.com/box/box-content-preview/commit/5142e45)), closes [#773](https://github.com/box/box-content-preview/issues/773)
* Mojito: Update translations (#771) ([bd2e74f](https://github.com/box/box-content-preview/commit/bd2e74f)), closes [#771](https://github.com/box/box-content-preview/issues/771)
* Docs: Update functional tests README.md (#768) ([5ed871e](https://github.com/box/box-content-preview/commit/5ed871e)), closes [#768](https://github.com/box/box-content-preview/issues/768)
* Revert "Fix: Add blend mode fallbacks if not supported (#758)" (#769) ([b80dafc](https://github.com/box/box-content-preview/commit/b80dafc)), closes [#758](https://github.com/box/box-content-preview/issues/758) [#769](https://github.com/box/box-content-preview/issues/769)



<a name="1.39.0"></a>
## 1.39.0 (2018-04-10)

* Update: box-annotations to v1.3.0 (#764) ([77bb4cc](https://github.com/box/box-content-preview/commit/77bb4cc)), closes [#764](https://github.com/box/box-content-preview/issues/764)
* Update: Issue template (#762) ([23a0059](https://github.com/box/box-content-preview/commit/23a0059)), closes [#762](https://github.com/box/box-content-preview/issues/762)
* Fix: Add blend mode fallbacks if not supported (#758) ([95def3b](https://github.com/box/box-content-preview/commit/95def3b)), closes [#758](https://github.com/box/box-content-preview/issues/758)
* Fix: release script (#757) ([203e55d](https://github.com/box/box-content-preview/commit/203e55d)), closes [#757](https://github.com/box/box-content-preview/issues/757)
* Fix: Remove use of manifest loaded event (#763) ([99edac8](https://github.com/box/box-content-preview/commit/99edac8)), closes [#763](https://github.com/box/box-content-preview/issues/763)
* Fix: Revert media duration setting to on loadeddata (#759) ([df798d1](https://github.com/box/box-content-preview/commit/df798d1)), closes [#759](https://github.com/box/box-content-preview/issues/759)



<a name="1.38.0"></a>
## 1.38.0 (2018-04-03)

* Mojito: Update translations (#755) ([94e605f](https://github.com/box/box-content-preview/commit/94e605f)), closes [#755](https://github.com/box/box-content-preview/issues/755)
* Update: box-annotations to v1.2.0 (#756) ([9a2fd61](https://github.com/box/box-content-preview/commit/9a2fd61)), closes [#756](https://github.com/box/box-content-preview/issues/756)
* Chore: Add nsp package and include with CI build (#748) ([f3b83d6](https://github.com/box/box-content-preview/commit/f3b83d6)), closes [#748](https://github.com/box/box-content-preview/issues/748)
* Chore: Only reset to upstream/master for major/minor releases (#750) ([aa2b8ab](https://github.com/box/box-content-preview/commit/aa2b8ab)), closes [#750](https://github.com/box/box-content-preview/issues/750)
* Docs: Updating issue template (#753) ([a90bc73](https://github.com/box/box-content-preview/commit/a90bc73)), closes [#753](https://github.com/box/box-content-preview/issues/753)
* Fix: presentation viewer keyboard shortcuts (#754) ([9014bad](https://github.com/box/box-content-preview/commit/9014bad)), closes [#754](https://github.com/box/box-content-preview/issues/754)
* Fix: Retain quality setting when setting/switching audio tracks (#720) ([adc84e1](https://github.com/box/box-content-preview/commit/adc84e1)), closes [#720](https://github.com/box/box-content-preview/issues/720)



<a name="1.37.0"></a>
## 1.37.0 (2018-03-28)

* Fix: Download watermarked (#746) ([de4475d](https://github.com/box/box-content-preview/commit/de4475d)), closes [#746](https://github.com/box/box-content-preview/issues/746)
* Fix: Only check flash for SWF files (#747) ([85b8ee4](https://github.com/box/box-content-preview/commit/85b8ee4)), closes [#747](https://github.com/box/box-content-preview/issues/747)
* Update: box-annotations to v1.1.1 (#751) ([8b267aa](https://github.com/box/box-content-preview/commit/8b267aa)), closes [#751](https://github.com/box/box-content-preview/issues/751)
* Chore: Remove unused babel-polyfill (#737) ([85f6d7e](https://github.com/box/box-content-preview/commit/85f6d7e)), closes [#737](https://github.com/box/box-content-preview/issues/737)
* Chore: Use key decoder from box react ui to prevent duplication (#749) ([575821f](https://github.com/box/box-content-preview/commit/575821f)), closes [#749](https://github.com/box/box-content-preview/issues/749)



<a name="1.36.0"></a>
## 1.36.0 (2018-03-27)

* Update: box-annotations to v1.1.0 (#744) ([03e889c](https://github.com/box/box-content-preview/commit/03e889c)), closes [#744](https://github.com/box/box-content-preview/issues/744)
* Chore: Add header for pdf compression (#591) ([ad97a90](https://github.com/box/box-content-preview/commit/ad97a90)), closes [#591](https://github.com/box/box-content-preview/issues/591)
* Chore: Cleanup docs (#743) ([a902138](https://github.com/box/box-content-preview/commit/a902138)), closes [#743](https://github.com/box/box-content-preview/issues/743)
* Chore: document controls functional tests + improve reliability (#716) ([67e1b71](https://github.com/box/box-content-preview/commit/67e1b71)), closes [#716](https://github.com/box/box-content-preview/issues/716)
* Chore: enable eslint for unit tests (#738) ([234feb0](https://github.com/box/box-content-preview/commit/234feb0)), closes [#738](https://github.com/box/box-content-preview/issues/738)
* Mojito: Update translations (#736) ([42b9fb6](https://github.com/box/box-content-preview/commit/42b9fb6)), closes [#736](https://github.com/box/box-content-preview/issues/736)
* Mojito: Update translations (#742) ([98c7c4c](https://github.com/box/box-content-preview/commit/98c7c4c)), closes [#742](https://github.com/box/box-content-preview/issues/742)
* Fix: Cleanup baseViewer.hasAnnotationPermissions() and tests (#685) ([daa8e86](https://github.com/box/box-content-preview/commit/daa8e86)), closes [#685](https://github.com/box/box-content-preview/issues/685)
* Fix: display error when previewing flash and not enabled (#733) ([794a053](https://github.com/box/box-content-preview/commit/794a053)), closes [#733](https://github.com/box/box-content-preview/issues/733)
* Fix: Document controls functional tests (#735) ([c914237](https://github.com/box/box-content-preview/commit/c914237)), closes [#735](https://github.com/box/box-content-preview/issues/735)
* Fix: document findbar no longer ignores useHotkeys (#724) ([4e0bddc](https://github.com/box/box-content-preview/commit/4e0bddc)), closes [#724](https://github.com/box/box-content-preview/issues/724)
* Fix: fix functional tests (#734) ([d0f7a34](https://github.com/box/box-content-preview/commit/d0f7a34)), closes [#734](https://github.com/box/box-content-preview/issues/734)
* Fix: parse options during show instead of after token response (#725) ([312c300](https://github.com/box/box-content-preview/commit/312c300)), closes [#725](https://github.com/box/box-content-preview/issues/725)
* Fix: Reduce WebGL checks to reduce instances of Rats! error (#728) ([f2b389f](https://github.com/box/box-content-preview/commit/f2b389f)), closes [#728](https://github.com/box/box-content-preview/issues/728)
* New: Enable Preview support for iWork file types (#741) ([8039f1d](https://github.com/box/box-content-preview/commit/8039f1d)), closes [#741](https://github.com/box/box-content-preview/issues/741)
* Docs: Watermarking preferences (#729) ([626ccfa](https://github.com/box/box-content-preview/commit/626ccfa)), closes [#729](https://github.com/box/box-content-preview/issues/729)



<a name="1.35.0"></a>
## 1.35.0 (2018-03-20)

* Update: box-annotations to v1.0.0 (#727) ([272038c](https://github.com/box/box-content-preview/commit/272038c)), closes [#727](https://github.com/box/box-content-preview/issues/727)
* Mojito: Update translations (#726) ([ea62af8](https://github.com/box/box-content-preview/commit/ea62af8)), closes [#726](https://github.com/box/box-content-preview/issues/726)
* New: Watermarking preferences (#721) ([a49f234](https://github.com/box/box-content-preview/commit/a49f234)), closes [#721](https://github.com/box/box-content-preview/issues/721)
* Use correct property for handle viewer event (#722) ([61fa208](https://github.com/box/box-content-preview/commit/61fa208)), closes [#722](https://github.com/box/box-content-preview/issues/722)
* Fix: Allow annotation text to be selectable (#719) ([929e5bf](https://github.com/box/box-content-preview/commit/929e5bf)), closes [#719](https://github.com/box/box-content-preview/issues/719)
* Docs: Fix docs for prefetchViewers() (#718) ([f656064](https://github.com/box/box-content-preview/commit/f656064)), closes [#718](https://github.com/box/box-content-preview/issues/718)



<a name="1.34.0"></a>
## 1.34.0 (2018-03-14)

* Update: box-annotations to v0.16.0 (#717) ([8763a4a](https://github.com/box/box-content-preview/commit/8763a4a)), closes [#717](https://github.com/box/box-content-preview/issues/717)
* Update: Uppercase unsupported file types (#710) ([b3ddc6a](https://github.com/box/box-content-preview/commit/b3ddc6a)), closes [#710](https://github.com/box/box-content-preview/issues/710)
* Fix: Avoid use of Number.isFinite() (#711) ([0f31aee](https://github.com/box/box-content-preview/commit/0f31aee)), closes [#711](https://github.com/box/box-content-preview/issues/711)
* Fix: HD gear icon when manually changing quality (#706) ([7c27360](https://github.com/box/box-content-preview/commit/7c27360)), closes [#706](https://github.com/box/box-content-preview/issues/706)
* Fix: startAt should disable document preload (#714) ([8c38180](https://github.com/box/box-content-preview/commit/8c38180)), closes [#714](https://github.com/box/box-content-preview/issues/714)
* Chore: Add util tests and fix file tests (#709) ([1102077](https://github.com/box/box-content-preview/commit/1102077)), closes [#709](https://github.com/box/box-content-preview/issues/709)
* Chore: Adding download reachability checks to other viewers (#705) ([ac73b92](https://github.com/box/box-content-preview/commit/ac73b92)), closes [#705](https://github.com/box/box-content-preview/issues/705)
* Chore: update status for jobs in saucelabs (#713) ([d133dc0](https://github.com/box/box-content-preview/commit/d133dc0)), closes [#713](https://github.com/box/box-content-preview/issues/713)
* Chore: Use box-locales to get the locale list (#708) ([cac7279](https://github.com/box/box-content-preview/commit/cac7279)), closes [#708](https://github.com/box/box-content-preview/issues/708)
* Mojito: Update translations (#707) ([14de771](https://github.com/box/box-content-preview/commit/14de771)), closes [#707](https://github.com/box/box-content-preview/issues/707)
* Mojito: Update translations (#712) ([7da455b](https://github.com/box/box-content-preview/commit/7da455b)), closes [#712](https://github.com/box/box-content-preview/issues/712)



<a name="1.33.0"></a>
# 1.33.0 (2018-03-07)

* Create load timeout error and guard trigger error (#693) ([8f66050](https://github.com/box/box-content-preview/commit/8f66050))
* Chore: add unit test for prefetching actual viewers (#692) ([a7fc08c](https://github.com/box/box-content-preview/commit/a7fc08c))
* Chore: Adding download reachability checks to Downloads, Document and Image Viewers (#669) ([6468d63](https://github.com/box/box-content-preview/commit/6468d63))
* Chore: support for numeric file id (#695) ([040d148](https://github.com/box/box-content-preview/commit/040d148))
* Chore: use handViewerMetrics() to log successful/failed preview (#700) ([621ab20](https://github.com/box/box-content-preview/commit/621ab20))
* Fix: move startAt from constructor to setup (#690) ([164e036](https://github.com/box/box-content-preview/commit/164e036))
* Fix: Polyfill Reflect.construct and Array.from for IE11 (#694) ([3f136a7](https://github.com/box/box-content-preview/commit/3f136a7))
* Fix: Preview error viewer in platform and IE11 (#696) ([cc09a61](https://github.com/box/box-content-preview/commit/cc09a61))
* Fix: Removing reliance on String includes (#699) ([6724275](https://github.com/box/box-content-preview/commit/6724275))
* Update: box-annotations to v0.15.0 (#704) ([b1a0e03](https://github.com/box/box-content-preview/commit/b1a0e03))
* Upgrade: shaka player to 2.3.3 (#703) ([de8d73f](https://github.com/box/box-content-preview/commit/de8d73f))
* New: timestamp unit for startAt (#691) ([79ec9da](https://github.com/box/box-content-preview/commit/79ec9da))
* Mojito: Update translations (#697) ([4d43624](https://github.com/box/box-content-preview/commit/4d43624))
* Mojito: Update translations (#701) ([bd97236](https://github.com/box/box-content-preview/commit/bd97236))



<a name="1.32.0"></a>
# 1.32.0 (2018-02-28)

* Update: box-annotations to v0.14.0 (#689) ([b789807](https://github.com/box/box-content-preview/commit/b789807))
* Update: Change undownloadable error message (#681) ([fea0cbe](https://github.com/box/box-content-preview/commit/fea0cbe))
* Update: Modify file info retry logic (#675) ([565f675](https://github.com/box/box-content-preview/commit/565f675))
* Mojito: Update translations (#683) ([aeae547](https://github.com/box/box-content-preview/commit/aeae547))
* Mojito: Update translations (#688) ([d13b39b](https://github.com/box/box-content-preview/commit/d13b39b))
* New: startAt file option support for media and document viewers (#663) ([34e7e37](https://github.com/box/box-content-preview/commit/34e7e37))
* Fix: Downgrade pdf.js (#687) ([018f71c](https://github.com/box/box-content-preview/commit/018f71c))
* Fix: filmstrip on previously played video (#680) ([d701f65](https://github.com/box/box-content-preview/commit/d701f65))
* Chore: Adding yarn install before common package.json scripts (#682) ([5e8bacc](https://github.com/box/box-content-preview/commit/5e8bacc))
* Chore: Allow viewers to emit metrics (#679) ([4ed0168](https://github.com/box/box-content-preview/commit/4ed0168))
* Chore: Refactor preview errors (#674) ([ee559fc](https://github.com/box/box-content-preview/commit/ee559fc))



<a name="1.31.0"></a>
# 1.31.0 (2018-02-20)

* Release: 1.31.0 ([be3d597](https://github.com/box/box-content-preview/commit/be3d597))
* Release: 1.32.0 ([18add25](https://github.com/box/box-content-preview/commit/18add25))
* Mojito: Update translations (#656) ([8f823e0](https://github.com/box/box-content-preview/commit/8f823e0))
* Mojito: Update translations (#672) ([45e17df](https://github.com/box/box-content-preview/commit/45e17df))
* Update: Add un-downloadable error case (#667) ([28a64aa](https://github.com/box/box-content-preview/commit/28a64aa))
* Update: Rename `pauseRequireJS` option to `fixDependencies` (#631) ([77fa2e2](https://github.com/box/box-content-preview/commit/77fa2e2))
* Chore: change travis notifications (#661) ([efe8b04](https://github.com/box/box-content-preview/commit/efe8b04))
* Chore: modify email for travis notifications (#664) ([120adc9](https://github.com/box/box-content-preview/commit/120adc9))
* Chore: pass file id to RepStatus for easier timers (#660) ([6bfb193](https://github.com/box/box-content-preview/commit/6bfb193))
* Chore: update readme and changlog to reflect correct versions (#671) ([f5bbc39](https://github.com/box/box-content-preview/commit/f5bbc39))
* Fix: define check (#668) ([2edc0ff](https://github.com/box/box-content-preview/commit/2edc0ff))
* Fix: markdown ul and ol css overrides (#651) ([822a98c](https://github.com/box/box-content-preview/commit/822a98c))
* Upgrade: pdf.js 2.0.363 (#659) ([754faa4](https://github.com/box/box-content-preview/commit/754faa4))
* Upgrade: Shaka Player 2.3.2 (#657) ([58f15cf](https://github.com/box/box-content-preview/commit/58f15cf))
* Revert "Chore: modify email for travis notifications (#664)" (#666) ([1a5c04b](https://github.com/box/box-content-preview/commit/1a5c04b))
* Docs: Add documentation for singlePageViewer (#662) ([78a0b52](https://github.com/box/box-content-preview/commit/78a0b52))



<a name="1.30.0"></a>
# 1.30.0 (2018-02-13)

* Update: box-annotations to v0.13.0 (#655) ([ebeb0fc](https://github.com/box/box-content-preview/commit/ebeb0fc))
* New: Emit preview metric and error messages (#648) ([d5606d1](https://github.com/box/box-content-preview/commit/d5606d1))
* Revert "Chore: Add download reachability checks to Document and Image viewers (#611)" (#654) ([ddcbdbb](https://github.com/box/box-content-preview/commit/ddcbdbb))
* Mojito: Update translations (#642) ([ad4a4ff](https://github.com/box/box-content-preview/commit/ad4a4ff))
* Mojito: Update translations (#652) ([fa6e736](https://github.com/box/box-content-preview/commit/fa6e736))
* Chore: add config for saucelabs naming (#638) ([beee7ea](https://github.com/box/box-content-preview/commit/beee7ea))
* Chore: Add download reachability checks to Document and Image viewers (#611) ([dd259b0](https://github.com/box/box-content-preview/commit/dd259b0))
* Chore: add promise polyfill to functional tests (#644) ([6671431](https://github.com/box/box-content-preview/commit/6671431))
* Chore: add retries to functional tests (#646) ([fe5ebdc](https://github.com/box/box-content-preview/commit/fe5ebdc))
* Chore: change functional tests to keep browser state between tests (#645) ([e68af74](https://github.com/box/box-content-preview/commit/e68af74))
* Chore: functional test framework using CodeceptJS (#628) ([8cab696](https://github.com/box/box-content-preview/commit/8cab696))
* Chore: modify browser in codecept config (#643) ([ce3d50c](https://github.com/box/box-content-preview/commit/ce3d50c))
* Chore: Removing soon to be deprecated JWT addon in travis (#637) ([46d7720](https://github.com/box/box-content-preview/commit/46d7720))
* Chore: Replace slack notifications with email (#649) ([8d8cb0a](https://github.com/box/box-content-preview/commit/8d8cb0a))
* Chore: update functional tests to add mobile tag (#639) ([9d2e5be](https://github.com/box/box-content-preview/commit/9d2e5be))
* Chore: update node version in development setup (#635) ([48ae594](https://github.com/box/box-content-preview/commit/48ae594))
* Chore: update travis config for saucelabs (#647) ([c15c454](https://github.com/box/box-content-preview/commit/c15c454))
* Fix: remove filesystem helper from codecept config (#636) ([fd1fc62](https://github.com/box/box-content-preview/commit/fd1fc62))



<a name="1.29.0"></a>
# 1.29.0 (2018-02-06)

* Update: Add annotation button strings for localizing (#623) ([ed63a02](https://github.com/box/box-content-preview/commit/ed63a02))
* Update: box-annotations to v0.11.1 (#620) ([149f1b6](https://github.com/box/box-content-preview/commit/149f1b6))
* Update: box-annotations to v0.12.0 (#632) ([be4a532](https://github.com/box/box-content-preview/commit/be4a532))
* Chore: No longer silently handle errors in callbacks (#626) ([7d4146b](https://github.com/box/box-content-preview/commit/7d4146b))
* Chore: Refactor lodash (#627) ([e6297a7](https://github.com/box/box-content-preview/commit/e6297a7))
* New: Add in SinglePageViewer for pdfs (#606) ([1ad415c](https://github.com/box/box-content-preview/commit/1ad415c))
* New: Option to disable `preview` event log (#630) ([79c0290](https://github.com/box/box-content-preview/commit/79c0290)), closes [#471](https://github.com/box/box-content-preview/issues/471)
* New: Support previews of non-current file versions (#608) ([e7e154c](https://github.com/box/box-content-preview/commit/e7e154c)), closes [#570](https://github.com/box/box-content-preview/issues/570)
* Fix: Annotations upgrade script (#613) ([9d086a9](https://github.com/box/box-content-preview/commit/9d086a9))
* Fix: Bind close method in DocFindBar (#615) ([faac9c0](https://github.com/box/box-content-preview/commit/faac9c0)), closes [#615](https://github.com/box/box-content-preview/issues/615)
* Fix: Generate i18n json files before running prod webpack build (#616) ([fbdeb78](https://github.com/box/box-content-preview/commit/fbdeb78))
* Fix: No longer account for header above notification wrapper (#621) ([d29f320](https://github.com/box/box-content-preview/commit/d29f320))
* Fix: use getBoundingClientRect in settings menu to prevent scrollbar when zoomed (#622) ([943269c](https://github.com/box/box-content-preview/commit/943269c))
* Mojito: Update translations (#625) ([01b7d83](https://github.com/box/box-content-preview/commit/01b7d83))



<a name="1.28.0"></a>
# 1.28.0 (2018-01-31)

* Update: box-annotations to v0.11.0 (#612) ([cb281a6](https://github.com/box/box-content-preview/commit/cb281a6))
* Chore: Add safety check in util.replaceHeader() (#610) ([3a47c2e](https://github.com/box/box-content-preview/commit/3a47c2e))
* Chore: Allow notifications to persist (#605) ([e8992c7](https://github.com/box/box-content-preview/commit/e8992c7))
* Chore: remove useless event unbinding (#604) ([618f106](https://github.com/box/box-content-preview/commit/618f106))
* Fix: Image viewer flickering in IE11 during reset zoom (#594) ([d43094f](https://github.com/box/box-content-preview/commit/d43094f))
* Fix: Prevent navigation on empty collections (#607) ([217fbce](https://github.com/box/box-content-preview/commit/217fbce))
* Mojito: Update translations (#602) ([fd711bb](https://github.com/box/box-content-preview/commit/fd711bb))



<a name="1.27.0"></a>
# 1.27.0 (2018-01-24)

* Event names into separate file (#589) ([3805904](https://github.com/box/box-content-preview/commit/3805904))
* Fix settings menu title cut off by scrollbar (#599) ([cdb627e](https://github.com/box/box-content-preview/commit/cdb627e)), closes [#599](https://github.com/box/box-content-preview/issues/599)
* Update README.md ([e590ff9](https://github.com/box/box-content-preview/commit/e590ff9))
* Update: box-annotations to v0.10.0 (#601) ([a2397ce](https://github.com/box/box-content-preview/commit/a2397ce))
* Fix: Disable annotations if user has neither annotate nor view permissions (#598) ([d8c4ebd](https://github.com/box/box-content-preview/commit/d8c4ebd))
* Fix: mobile audio controls overlap with navigation (#590) ([a7ed4fc](https://github.com/box/box-content-preview/commit/a7ed4fc))
* Fix: Properly binding imageViewer.updatePannability() (#600) ([e18aeb6](https://github.com/box/box-content-preview/commit/e18aeb6))
* Docs: Add self-hosting instructions to README.md (#597) ([56cbb11](https://github.com/box/box-content-preview/commit/56cbb11))
* Mojito: Update translations (#596) ([fd635b2](https://github.com/box/box-content-preview/commit/fd635b2))
* New: Specific error messages for unsupported/tariff restricted files (#593) ([941070e](https://github.com/box/box-content-preview/commit/941070e))



<a name="1.26.0"></a>
# 1.26.0 (2018-01-18)

* Update: Annotations upgrade script to push to new remotes if needed (#566) ([1422ba0](https://github.com/box/box-content-preview/commit/1422ba0))
* Update: Filter out access tokens from error messages (#581) ([afc0844](https://github.com/box/box-content-preview/commit/afc0844))
* Update: Respect 'Retry-After' header if present (#582) ([2b6fa14](https://github.com/box/box-content-preview/commit/2b6fa14))
* Fix: Check correct options when passing in BoxAnnotations instance (#584) ([30e171e](https://github.com/box/box-content-preview/commit/30e171e))
* Fix: Ensure only loading wrapper is interactable preview container (#583) ([eba78eb](https://github.com/box/box-content-preview/commit/eba78eb))
* Fix: fullscreen controls not shown in IE11 (#588) ([e3d0f5c](https://github.com/box/box-content-preview/commit/e3d0f5c))
* Fix: Set up notification in Preview.finishLoading() (#579) ([efd0621](https://github.com/box/box-content-preview/commit/efd0621)), closes [#563](https://github.com/box/box-content-preview/issues/563)
* Fix: Temporarily disable requireJS if specified to load 3rd party deps (#561) ([3f26c81](https://github.com/box/box-content-preview/commit/3f26c81))
* Update README.md (#568) ([27d3972](https://github.com/box/box-content-preview/commit/27d3972))
* New: Enhanced pinch to zoom (#567) ([b59b453](https://github.com/box/box-content-preview/commit/b59b453))



<a name="1.25.0"></a>
# 1.25.0 (2018-01-11)

* Update: box-annotations to v0.8.1 (#575) ([1f98c92](https://github.com/box/box-content-preview/commit/1f98c92))
* Update: box-annotations to v0.9.0 (#578) ([c1bdd28](https://github.com/box/box-content-preview/commit/c1bdd28))
* Mojito: Update translations (#574) ([5689492](https://github.com/box/box-content-preview/commit/5689492))
* Chore: Setup viewer notifications in the correct location (#563) ([2b37a36](https://github.com/box/box-content-preview/commit/2b37a36))
* New: Add preview support for Google Slides (#302) ([f914930](https://github.com/box/box-content-preview/commit/f914930))



<a name="1.24.0"></a>
# 1.24.0 (2018-01-03)

* Update: box-annotations to v0.7.2 (#558) ([0fb95c1](https://github.com/box/box-content-preview/commit/0fb95c1))
* Update: box-annotations to v0.7.3 (#559) ([8c1f6a7](https://github.com/box/box-content-preview/commit/8c1f6a7))
* Update: box-annotations to v0.8.0 (#565) ([df38a05](https://github.com/box/box-content-preview/commit/df38a05))
* Update: Link to specific Annotations release tag in commit (#564) ([907599b](https://github.com/box/box-content-preview/commit/907599b))
* Chore: Add safety check for annotatorConfig (#554) ([c1f0bc0](https://github.com/box/box-content-preview/commit/c1f0bc0))
* Chore: setOriginalImageSize() for multi image viewer (#547) ([697b03c](https://github.com/box/box-content-preview/commit/697b03c))
* Fix: Auto hide scrollbars for CSV on IE/Edge (#546) ([9509619](https://github.com/box/box-content-preview/commit/9509619))
* Fix: Never cache watermarked files, add reload() method (#562) ([3302906](https://github.com/box/box-content-preview/commit/3302906))



<a name="1.23.0"></a>
# 1.23.0 (2017-12-20)

* Fix: Add bindings for more audio-track and subtitles controls (#550) ([2028939](https://github.com/box/box-content-preview/commit/2028939))
* Fix: Rename "watermark-cache" query param to "watermark_content" (#557) ([a8639a9](https://github.com/box/box-content-preview/commit/a8639a9))
* Update: box-annotations to v0.7.1 (#555) ([00fd0cb](https://github.com/box/box-content-preview/commit/00fd0cb))
* Chore: Update documentation to include disabling presentation viewer (#552) ([0c47805](https://github.com/box/box-content-preview/commit/0c47805))



<a name="1.22.0"></a>
# 1.22.0 (2017-12-12)

* Update: box-annotations to v0.7.0 (#545) ([414113a](https://github.com/box/box-content-preview/commit/414113a))
* Update: Do not prefetch for mp4 and mp3 viewers (#536) ([f5e487f](https://github.com/box/box-content-preview/commit/f5e487f))
* Fix: build-rb required before building ci (#538) ([85215b5](https://github.com/box/box-content-preview/commit/85215b5))
* Fix: Building preview before running tests (#537) ([a0e4e0c](https://github.com/box/box-content-preview/commit/a0e4e0c))
* Fix: Validate passed in boxAnnotations is instance of the proper type (#542) ([3a1ae72](https://github.com/box/box-content-preview/commit/3a1ae72))
* New: Allow BoxAnnotations to be passed in as a Preview option (#539) ([e3281cf](https://github.com/box/box-content-preview/commit/e3281cf))
* Chore: Add multiple travis steps so we can run UI tests in a 'cron' case (#532) ([65e35f1](https://github.com/box/box-content-preview/commit/65e35f1))
* Chore: add slack notifications for failed cron jobs (#541) ([a2763af](https://github.com/box/box-content-preview/commit/a2763af))
* Chore: Add tests for annotationsLoadHandler (#540) ([ae68bcb](https://github.com/box/box-content-preview/commit/ae68bcb))
* Chore: Increasing wait time and test timeouts (#535) ([2220c1c](https://github.com/box/box-content-preview/commit/2220c1c))
* Chore: Lazy load annotations using new chunk (#516) ([062ea38](https://github.com/box/box-content-preview/commit/062ea38))



<a name="1.21.0"></a>
# 1.21.0 (2017-12-06)

* Fix: Bind download function in Preview.js (#520) ([359abcf](https://github.com/box/box-content-preview/commit/359abcf))
* Fix: Enable HD settings only if HD rep is available (#495) ([e4302e3](https://github.com/box/box-content-preview/commit/e4302e3))
* Fix: Fix inheritance and add bindings for controls options (#523) ([942329d](https://github.com/box/box-content-preview/commit/942329d)), closes [#523](https://github.com/box/box-content-preview/issues/523)
* Fix: Only remove the timeupdate listener if it has been bound before (#525) ([5c8dffa](https://github.com/box/box-content-preview/commit/5c8dffa))
* Fix: Properly bind download button in PreviewErrorViewer (#527) ([122e0c9](https://github.com/box/box-content-preview/commit/122e0c9))
* Fix: Revert source-map change to fix imported values (#530) ([66c71b1](https://github.com/box/box-content-preview/commit/66c71b1)), closes [#530](https://github.com/box/box-content-preview/issues/530)
* Update: box-annotations to v0.5.1 (#524) ([518f42b](https://github.com/box/box-content-preview/commit/518f42b))
* Update: box-annotations to v0.6.0 (#531) ([1f26be5](https://github.com/box/box-content-preview/commit/1f26be5))
* Update: Sinon to v4.1.2 & remove deprecated methods from tests (#529) ([b1596ee](https://github.com/box/box-content-preview/commit/b1596ee))
* Mojito: adding Bengali, Hindi and Latin America Spanish (#526) ([96916a6](https://github.com/box/box-content-preview/commit/96916a6))
* Mojito: Update translations (#515) ([5503738](https://github.com/box/box-content-preview/commit/5503738))
* Chore: Change webpack source maps to 'inline-cheap-source-map' (#513) ([fc71416](https://github.com/box/box-content-preview/commit/fc71416))
* Chore: only use source maps when running unit tests in debug mode (#514) ([06e390d](https://github.com/box/box-content-preview/commit/06e390d))



<a name="1.20.0"></a>
# 1.20.0 (2017-11-29)

* Chore: extract file loading icons to be used globally throughout preview (#490) ([ec2fc3b](https://github.com/box/box-content-preview/commit/ec2fc3b))
* Chore: Remove autobind for Office and Media files (#505) ([0ecfd5e](https://github.com/box/box-content-preview/commit/0ecfd5e))
* Chore: Remove autobind from 3d controls (#508) ([5aa3bc8](https://github.com/box/box-content-preview/commit/5aa3bc8))
* Chore: Remove autobind from 3d viewers (#503) ([411f319](https://github.com/box/box-content-preview/commit/411f319))
* Chore: Remove autobind from BaseViewer (#502) ([6d534be](https://github.com/box/box-content-preview/commit/6d534be))
* Chore: Remove autobind from DocFindBar (#510) ([2a750e7](https://github.com/box/box-content-preview/commit/2a750e7))
* Chore: Remove autobind from Document and Presentation Viewers (#507) ([cd3c67e](https://github.com/box/box-content-preview/commit/cd3c67e))
* Chore: Remove autobind from error viewer (#506) ([4fd7eda](https://github.com/box/box-content-preview/commit/4fd7eda))
* Chore: Remove autobind from text viewers (#511) ([a2b93fd](https://github.com/box/box-content-preview/commit/a2b93fd))
* Chore: Remove autobind-decorator (#519) ([146f55c](https://github.com/box/box-content-preview/commit/146f55c))
* Chore: Removing autobind from Preview.js (#500) ([6d61b9d](https://github.com/box/box-content-preview/commit/6d61b9d))
* Update: box-annotations to v0.3.1 (#489) ([a9580a6](https://github.com/box/box-content-preview/commit/a9580a6))
* Update: box-annotations to v0.4.0 (#497) ([808270b](https://github.com/box/box-content-preview/commit/808270b))
* Update: box-annotations to v0.5.0 (#518) ([ef82f49](https://github.com/box/box-content-preview/commit/ef82f49))
* Remove autobind from image viewers (#501) ([3b596b0](https://github.com/box/box-content-preview/commit/3b596b0))
* Fix: BaseViewer debounced resize handler binding (#509) ([32f3c9a](https://github.com/box/box-content-preview/commit/32f3c9a))
* Fix: Cachebust original representation URL (#493) ([2005863](https://github.com/box/box-content-preview/commit/2005863))
* Fix: fix full screen overflow on Windows Chrome (#491) ([eee1525](https://github.com/box/box-content-preview/commit/eee1525)), closes [#491](https://github.com/box/box-content-preview/issues/491)
* Fix: Media player control menus show scrollbars during transition (#494) ([80e07c6](https://github.com/box/box-content-preview/commit/80e07c6))
* Fix: Presentation preloading scales without max (#487) ([11b2277](https://github.com/box/box-content-preview/commit/11b2277))
* Fix: Properly remove transitionend handler (#499) ([79b4576](https://github.com/box/box-content-preview/commit/79b4576))
* Fix: Remove unhandled errors from unit tests (#498) ([2e71743](https://github.com/box/box-content-preview/commit/2e71743))
* Fix: Reset retry count after successful preview (#488) ([a8f66ed](https://github.com/box/box-content-preview/commit/a8f66ed))



<a name="1.19.0"></a>
# 1.19.0 (2017-11-14)

* Update: box-annotations to v0.2.1 (#479) ([1229c0e](https://github.com/box/box-content-preview/commit/1229c0e))
* Update: box-annotations to v0.3.0 (#485) ([a786dfe](https://github.com/box/box-content-preview/commit/a786dfe)), closes [#21](https://github.com/box/box-content-preview/issues/21) [#21](https://github.com/box/box-content-preview/issues/21)
* Update: Disable pdf.js streaming (#483) ([5a062c1](https://github.com/box/box-content-preview/commit/5a062c1))
* New: Updated file icons (#484) ([25d7840](https://github.com/box/box-content-preview/commit/25d7840))
* Fix: Correctly revoke objectURL for print blob in office viewer (#482) ([bc12c53](https://github.com/box/box-content-preview/commit/bc12c53))
* Fix: Simplify video resize logic (#480) ([b666605](https://github.com/box/box-content-preview/commit/b666605))
* Fix: toggleannotationmode event to trigger the right method (#478) ([f27bb07](https://github.com/box/box-content-preview/commit/f27bb07))
* Mojito: Update translations (#458) ([28fa161](https://github.com/box/box-content-preview/commit/28fa161))
* Upgrade: pdf.js v2.0.104 (#474) ([a86618f](https://github.com/box/box-content-preview/commit/a86618f))
*  Update: npm packages to latest versions (#472) ([26e8d7b](https://github.com/box/box-content-preview/commit/26e8d7b))



<a name="1.18.0"></a>
# 1.18.0 (2017-11-08)

* Update: box-annotations to v0.2.0 (#477) ([a7ffbb8](https://github.com/box/box-content-preview/commit/a7ffbb8))
* Chore: Temporarily disable functional tests (#476) ([bafb699](https://github.com/box/box-content-preview/commit/bafb699))
* Chore: Update LICENSE to generic Box SDK license (#437) ([619e2dd](https://github.com/box/box-content-preview/commit/619e2dd))
* Fix: es-MX clean-up (We'll be using es-419 instead) (#457) ([e78cf06](https://github.com/box/box-content-preview/commit/e78cf06))
* Fix: Instant Preview when thumbnail is pending (#473) ([a2f4f8b](https://github.com/box/box-content-preview/commit/a2f4f8b))
* New: Add script to upgrade box-annotations version in Preview (#468) ([7de9e4a](https://github.com/box/box-content-preview/commit/7de9e4a))
* New: Support preview of JSON files (#467) ([e758871](https://github.com/box/box-content-preview/commit/e758871))



<a name="1.17.0"></a>
# 1.17.0 (2017-10-31)

* New: Find method for documents (#460) ([3a0b868](https://github.com/box/box-content-preview/commit/3a0b868))
* New: Make findBar optional (#438) ([3ea11cc](https://github.com/box/box-content-preview/commit/3ea11cc))
* New: Update BaseViewer to use box-annotations npm package (#459) ([4f71ab2](https://github.com/box/box-content-preview/commit/4f71ab2))
* Fix: Fix fullscreen icon for video (#456) ([ef5614a](https://github.com/box/box-content-preview/commit/ef5614a)), closes [#456](https://github.com/box/box-content-preview/issues/456)
* Fix: update autoplay behavior (#461) ([c4778f8](https://github.com/box/box-content-preview/commit/c4778f8))
* Chore: Removing annotations from Box-Content-Preview (#451) ([fa7855e](https://github.com/box/box-content-preview/commit/fa7855e))
* Chore: Removing annotations README.md (#462) ([bdbb75a](https://github.com/box/box-content-preview/commit/bdbb75a))
* Mojito: Update translations (#452) ([9b7bbb7](https://github.com/box/box-content-preview/commit/9b7bbb7))
* Mojito: Update translations (#454) ([fcd3aad](https://github.com/box/box-content-preview/commit/fcd3aad))



<a name="1.16.0"></a>
# 1.16.0 (2017-10-24)

* New: add autoplay to media viewers (#433) ([10982de](https://github.com/box/box-content-preview/commit/10982de))
* New: Added enabledTypes property. Backwards compat for disabledTypes (#439) ([15a7712](https://github.com/box/box-content-preview/commit/15a7712))
* New: Enable 360 video on desktop Safari (#445) ([62a67f9](https://github.com/box/box-content-preview/commit/62a67f9))
* Fix: Annotations cleanup (#449) ([e8f6fd3](https://github.com/box/box-content-preview/commit/e8f6fd3))
* Fix: controller.handleAnnotationEvent() not bound correctly (#448) ([b11f2dd](https://github.com/box/box-content-preview/commit/b11f2dd))
* Fix: Don't revoke print URL if it doesn't exist (#444) ([9f06212](https://github.com/box/box-content-preview/commit/9f06212))
* Fix: Don't show notification on draw mode exit (#447) ([43422e4](https://github.com/box/box-content-preview/commit/43422e4))
* Fix: Fix draw selection and related bugs (#440) ([6a667f1](https://github.com/box/box-content-preview/commit/6a667f1)), closes [#440](https://github.com/box/box-content-preview/issues/440)
* Fix: Setting innerHTML in annotatorUtil.generateButton() (#446) ([4035d8e](https://github.com/box/box-content-preview/commit/4035d8e))
* Chore: Add JSDoc for Emit wrapper (#442) ([360989d](https://github.com/box/box-content-preview/commit/360989d))
* Chore: Passing localized strings into annotations (#441) ([0ae1c47](https://github.com/box/box-content-preview/commit/0ae1c47))



<a name="1.15.0"></a>
# 1.15.0 (2017-10-17)

*  New: Adding README.md for Annotations codebase + cleanup (#420) ([7df251e](https://github.com/box/box-content-preview/commit/7df251e))
* Revert "Chore: Temporarily allow draw annotations to be enabled via config (#416)" (#434) ([09c279d](https://github.com/box/box-content-preview/commit/09c279d))
* New: Disable right click when user does not have download permissions (#427) ([b3a6407](https://github.com/box/box-content-preview/commit/b3a6407))
* Fix: Prevent preview from erroring if  listener callback errors (#425) ([ed0efb8](https://github.com/box/box-content-preview/commit/ed0efb8))
* Fix: Prevent SVGs from depending on CSS for sizing (#426) ([86072bd](https://github.com/box/box-content-preview/commit/86072bd))
* Fix: Remove draw annotations flag (#436) ([87a3278](https://github.com/box/box-content-preview/commit/87a3278))
* Fix: Use local storage to cache media settings (#432) ([e26e323](https://github.com/box/box-content-preview/commit/e26e323))
* Chore: Add more detail to shaka error logging (#435) ([aa14549](https://github.com/box/box-content-preview/commit/aa14549))



<a name="1.14.0"></a>
# 1.14.0 (2017-10-11)

* Fix: Ensure we are displaying a valid error string (#414) ([ec908ba](https://github.com/box/box-content-preview/commit/ec908ba))
* Fix: Turn off rendering interactive forms (#430) ([99bdf48](https://github.com/box/box-content-preview/commit/99bdf48))



<a name="1.13.0"></a>
# 1.13.0 (2017-10-04)

* Fix: Only call setOriginalImageSize() on single page images (#394) ([8f1cc35](https://github.com/box/box-content-preview/commit/8f1cc35))
* Fix: Prevent canvas flickering on tap for mobile safari (#418) ([14322b8](https://github.com/box/box-content-preview/commit/14322b8))
* Fix: Prevent unnecessary draw code from executing (#421) ([d6cdcf9](https://github.com/box/box-content-preview/commit/d6cdcf9))
* Fix: Properly delete draw annotations threads (#412) ([529b9a4](https://github.com/box/box-content-preview/commit/529b9a4))
* Fix: Set watermark-cache params for dash segments (#422) ([ec68fd1](https://github.com/box/box-content-preview/commit/ec68fd1))
* Fix: Update Box3D and fix loading of Vive controller model ([eb613c6](https://github.com/box/box-content-preview/commit/eb613c6))
* Chore: Cleaning up draw dialogs (#423) ([26813a4](https://github.com/box/box-content-preview/commit/26813a4))
* Chore: Force threads to be inactive when the dialog hides (#424) ([90048ec](https://github.com/box/box-content-preview/commit/90048ec))
* Chore: Temporarily allow draw annotations to be enabled via config (#416) ([bd35003](https://github.com/box/box-content-preview/commit/bd35003))
* Chore: Upgrade packages and remove unnecessary dependencies (#410) ([150f038](https://github.com/box/box-content-preview/commit/150f038))
* Update: Upgrade Box3D to 14.0.0 ([04d3cc7](https://github.com/box/box-content-preview/commit/04d3cc7))
* Revert "Fix: Only call setOriginalImageSize() on single page images (#394)" (#415) ([d685dfe](https://github.com/box/box-content-preview/commit/d685dfe))
* Mojito: Update translations (#413) ([9fd5d4b](https://github.com/box/box-content-preview/commit/9fd5d4b))



<a name="1.12.0"></a>
# 1.12.0 (2017-09-26)

* Fix: Document print in Chrome (#406) ([54fa047](https://github.com/box/box-content-preview/commit/54fa047))
* Fix: Hookup cancel button (#404) ([6c7b63a](https://github.com/box/box-content-preview/commit/6c7b63a))
* Fix: Moved guards so drawing works when highlights disabled (#409) ([f516a4f](https://github.com/box/box-content-preview/commit/f516a4f))
* Fix: No longer relying on system time for flakey test (#398) ([1986f9a](https://github.com/box/box-content-preview/commit/1986f9a))
* New: Add new API to preview media player to play segments (#408) ([ef60e95](https://github.com/box/box-content-preview/commit/ef60e95))
* New: Draw annotations UI (#403) ([4cbfc0f](https://github.com/box/box-content-preview/commit/4cbfc0f))
* Update: Support additional query params in requests (#405) ([08da16b](https://github.com/box/box-content-preview/commit/08da16b))



<a name="1.11.0"></a>
# 1.11.0 (2017-09-19)

* Update: Box3D version 12.4.1 ([4e7eed1](https://github.com/box/box-content-preview/commit/4e7eed1))
* New: Allow documents to be viewed in presentation mode (#396) ([d8956a7](https://github.com/box/box-content-preview/commit/d8956a7))
* Fix: Additional logic to reset highlight-comment threads (#386) ([faef3df](https://github.com/box/box-content-preview/commit/faef3df))
* Fix: Downgrade pdf.js (#397) ([b8c6706](https://github.com/box/box-content-preview/commit/b8c6706))
* Fix: isPageNumFocused() null check (#401) ([b7eb6dc](https://github.com/box/box-content-preview/commit/b7eb6dc))
* Mojito: Update translations (#392) ([a23df00](https://github.com/box/box-content-preview/commit/a23df00))
* Mojito: Update translations (#399) ([ba4f354](https://github.com/box/box-content-preview/commit/ba4f354))
* Chore: Only getBrowserInfo() once per preview instance (#393) ([ba0d1f7](https://github.com/box/box-content-preview/commit/ba0d1f7))



<a name="1.10.0"></a>
# 1.10.0 (2017-09-13)

* Chore: Adding console errors for annotation errors (#388) ([3762ead](https://github.com/box/box-content-preview/commit/3762ead))
* Chore: Cleaning up old third party libraries (#390) ([ee0bc90](https://github.com/box/box-content-preview/commit/ee0bc90))
* Upgrade: pdf.js 1.9.558 (#389) ([4d76bdd](https://github.com/box/box-content-preview/commit/4d76bdd))
* Fix: Adding reply-container mobile padding + clearing currentAnnotationMode on mode exit (#370) ([05d3662](https://github.com/box/box-content-preview/commit/05d3662))
* Fix: disableAnnotationMode cannot be called on disallowed modes (#372) ([1d5a172](https://github.com/box/box-content-preview/commit/1d5a172))
* Fix: fix page change flickering when zoomed in (#384) ([d091704](https://github.com/box/box-content-preview/commit/d091704)), closes [#384](https://github.com/box/box-content-preview/issues/384)
* Fix: Passing event into thread.mouseoutHandler() (#375) ([2fe3c37](https://github.com/box/box-content-preview/commit/2fe3c37))
* Fix: Plain highlight is mispositioned when it runs off the side (#381) ([bfa50e5](https://github.com/box/box-content-preview/commit/bfa50e5))
* Fix: Respect view permissions when viewer.initAnnotations() is called (#379) ([ec043b9](https://github.com/box/box-content-preview/commit/ec043b9))
* Fix: Show point annotation above dialog only on hover (#383) ([63fafa5](https://github.com/box/box-content-preview/commit/63fafa5))
* Fix: Swapping Object.values() with Object.keys() (#371) ([23527a8](https://github.com/box/box-content-preview/commit/23527a8))
* Update: Allow passed in collections to be of file objects (#359) ([cc59009](https://github.com/box/box-content-preview/commit/cc59009))
* Update: Update Box3D to 12.3.0 ([e5899b2](https://github.com/box/box-content-preview/commit/e5899b2))
* Mojito: Update translations (#368) ([56fe656](https://github.com/box/box-content-preview/commit/56fe656))
* Mojito: Update translations (#373) ([b800397](https://github.com/box/box-content-preview/commit/b800397))
* Mojito: Update translations (#374) ([fe15754](https://github.com/box/box-content-preview/commit/fe15754))
* Mojito: Update translations (#382) ([bef23db](https://github.com/box/box-content-preview/commit/bef23db))
* New: drawing dialog (#364) ([5003c3d](https://github.com/box/box-content-preview/commit/5003c3d))
* New: Emit annotation thread events to the viewer and beyond (#377) ([dec86c6](https://github.com/box/box-content-preview/commit/dec86c6))
* New: More specific error messages from conversion (#378) ([a718718](https://github.com/box/box-content-preview/commit/a718718))
* New: Scroll file to annotation position on 'scrolltoannotation' (#366) ([c867fc7](https://github.com/box/box-content-preview/commit/c867fc7))



<a name="1.9.0"></a>
# 1.9.0 (2017-09-06)

* Fix: annotation mode exits on wrong button and fetch annotations returns non-promise (#363) ([aed6288](https://github.com/box/box-content-preview/commit/aed6288))
* Fix: Only hide point annotation icon when dialog is flipped (#369) ([d0ede36](https://github.com/box/box-content-preview/commit/d0ede36))
* Fix: Point 3D viewer at newest Box3D runtime ([3420799](https://github.com/box/box-content-preview/commit/3420799))
* Temp hide show ui for plain and comment highlights (#348) ([3dbddbf](https://github.com/box/box-content-preview/commit/3dbddbf))
* Feature: drawing annotation deletion (#337) ([34b9da1](https://github.com/box/box-content-preview/commit/34b9da1))
* Feature: Drawing boundary updates on each action (#356) ([8f7c2df](https://github.com/box/box-content-preview/commit/8f7c2df))
* Feature: drawingSelectionUI (#362) ([318501f](https://github.com/box/box-content-preview/commit/318501f))
* Chore: Add a page # for image annotations that were created without one (#357) ([bf6a6f9](https://github.com/box/box-content-preview/commit/bf6a6f9))
* Chore: Don't hide dialog on mouseout if mouse is in annotations dialog (#352) ([e01324b](https://github.com/box/box-content-preview/commit/e01324b))
* Chore: Position point annotation dialog based off icon location (#339) ([087350b](https://github.com/box/box-content-preview/commit/087350b))
* Chore: Store annotation threads by threadID in the thread map (#316) ([09aa1cd](https://github.com/box/box-content-preview/commit/09aa1cd))
* New: Flip point annotation dialog if in lower half of file (#353) ([dbe8f06](https://github.com/box/box-content-preview/commit/dbe8f06))
* New: Separate create and view permissions for annotations (#358) ([5d39f1f](https://github.com/box/box-content-preview/commit/5d39f1f))
* New: Support multiple audio tracks (#299) ([70f5b81](https://github.com/box/box-content-preview/commit/70f5b81))
* Mojito: Update translations (#354) ([eab7da5](https://github.com/box/box-content-preview/commit/eab7da5))
* Upgrade: Upgrade to shaka-player 2.1.8 (#351) ([4ec7b65](https://github.com/box/box-content-preview/commit/4ec7b65))



<a name="1.8.0"></a>
# 1.8.0 (2017-08-30)

* Update: Add Instant Preview loading overlay (#350) ([c361317](https://github.com/box/box-content-preview/commit/c361317))
* Update: Update Box3D to 12.2.1 (#336) ([5a45177](https://github.com/box/box-content-preview/commit/5a45177))
* New: Add method to get top right corner of a highlight annotation (#340) ([75b183d](https://github.com/box/box-content-preview/commit/75b183d))
* New: Preview file from offline passed file (#326) ([8547bc8](https://github.com/box/box-content-preview/commit/8547bc8))
* New: Turn on rendering of interactive forms (#349) ([77a38a0](https://github.com/box/box-content-preview/commit/77a38a0))
* Selectively disable annotations (#322) ([c6dac8a](https://github.com/box/box-content-preview/commit/c6dac8a))
* Update README.md (#335) ([886bd33](https://github.com/box/box-content-preview/commit/886bd33))
* Video player ui disappears in 360 video (#346) ([53fa9f5](https://github.com/box/box-content-preview/commit/53fa9f5))
* Fix: IE11 image size default (#333) ([bebdcec](https://github.com/box/box-content-preview/commit/bebdcec))
* Fix: Minor ESLint errors (#342) ([2318581](https://github.com/box/box-content-preview/commit/2318581))
* Fix: pass get failure through in case imageEl is a div of images (#338) ([1de741e](https://github.com/box/box-content-preview/commit/1de741e))
* Fix: Re-scale annotation canvases on zoom (#345) ([cd8b1af](https://github.com/box/box-content-preview/commit/cd8b1af))
* Fix: Safari font rendering issue (#332) ([847cd8c](https://github.com/box/box-content-preview/commit/847cd8c))
* Fix: Scaling canvas context when the canvas re-scales (#347) ([1bfa954](https://github.com/box/box-content-preview/commit/1bfa954))
* Chore: Automate simple server to make running functional tests easier (#334) ([69a585f](https://github.com/box/box-content-preview/commit/69a585f))
* Chore: log actual error message (#343) ([f1bc217](https://github.com/box/box-content-preview/commit/f1bc217))
* Chore: Refactor pageControls and scroll handling for multi page images (#321) ([f9f511e](https://github.com/box/box-content-preview/commit/f9f511e))
* Chore: Updating method decorators (#311) ([9ae3853](https://github.com/box/box-content-preview/commit/9ae3853))
* Upgrade: pdf.js 1.9.450 (#329) ([987a417](https://github.com/box/box-content-preview/commit/987a417))



<a name="1.7.0"></a>
# 1.7.0 (2017-08-23)

* New: Adding functional test base (#305) ([5dc3247](https://github.com/box/box-content-preview/commit/5dc3247))
* New: Support well-formed file object in show() (#328) ([540a011](https://github.com/box/box-content-preview/commit/540a011))
* Fix: Add page controls between zoom and fullscreen controls (#320) ([0441920](https://github.com/box/box-content-preview/commit/0441920))
* Fix: Create annotation in API using thread rather than threadNumber (#315) ([783adbc](https://github.com/box/box-content-preview/commit/783adbc))
* Fix: Ensure that image.handleMouseDown() is unbound in annotation mode (#319) ([fd477c7](https://github.com/box/box-content-preview/commit/fd477c7))
* Fix: Inconsistent natural image dimensions in IE (#324) ([2889b0d](https://github.com/box/box-content-preview/commit/2889b0d))
* Fix: Pass in the correct previousPage() for DocBaseViewer.pageControls (#318) ([27b118d](https://github.com/box/box-content-preview/commit/27b118d))
* Fix: Point annotation cleanup (#325) ([e27c18a](https://github.com/box/box-content-preview/commit/e27c18a))
* Fix: Re-showing viewer controls on 'annotationmodeexit' (#323) ([5900ece](https://github.com/box/box-content-preview/commit/5900ece))
* Feature: Drawing Annotations Undo Redo (#287) ([4b5421c](https://github.com/box/box-content-preview/commit/4b5421c))
* Chore: Cleaning up remaining annotations references outside BaseViewer (#314) ([efaa385](https://github.com/box/box-content-preview/commit/efaa385))



<a name="1.6.0"></a>
# 1.6.0 (2017-08-17)

* Chore: Cleaning up and consolidating annotation methods (#288) ([6542b5d](https://github.com/box/box-content-preview/commit/6542b5d))
* Chore: Fixed warning (#306) ([18daaf9](https://github.com/box/box-content-preview/commit/18daaf9)), closes [#306](https://github.com/box/box-content-preview/issues/306)
* Chore: Move getAnnotateButton() out of PreviewUI into Annotator (#312) ([715b026](https://github.com/box/box-content-preview/commit/715b026))
* Chore: Only remove annotation listeners if enabled on viewer (#293) ([9b97fd7](https://github.com/box/box-content-preview/commit/9b97fd7))
* Chore: Remove code supporting token in options object (#268) ([ba1ac34](https://github.com/box/box-content-preview/commit/ba1ac34))
* Chore: Toggling annotation mode handlers using emitted messages (#307) ([8e7d49a](https://github.com/box/box-content-preview/commit/8e7d49a))
* Chore: Updating docs.box.com links to developer.box.com in README (#282) ([b63eab2](https://github.com/box/box-content-preview/commit/b63eab2))
* Fix: annotation handler rebinding (#294) ([2dc0200](https://github.com/box/box-content-preview/commit/2dc0200))
* Fix: Do not display disabled annotation types on fetch (#301) ([c669375](https://github.com/box/box-content-preview/commit/c669375))
* Fix: Files must have .360 before extension to launch in 360 viewers. (#313) ([1659c4d](https://github.com/box/box-content-preview/commit/1659c4d))
* Fix: Fix release script after GitHub release (#295) ([00dff52](https://github.com/box/box-content-preview/commit/00dff52)), closes [#295](https://github.com/box/box-content-preview/issues/295)
* Fix: Forcing HD/SD should disable adaptation (#292) ([8cd67c1](https://github.com/box/box-content-preview/commit/8cd67c1))
* Fix: only hide the filmstrip if it exists (#309) ([1c70dd4](https://github.com/box/box-content-preview/commit/1c70dd4))
* Fix: scale being unbound when annotating (#297) ([289c645](https://github.com/box/box-content-preview/commit/289c645))
* New: Allow scrolling for multi-page image files (#308) ([37dfd4a](https://github.com/box/box-content-preview/commit/37dfd4a))
* New: Plain and Comment highlight annotations on mobile (#276) ([5b66c82](https://github.com/box/box-content-preview/commit/5b66c82))
* Feature: drawing annotation scaling (#267) ([2fd0655](https://github.com/box/box-content-preview/commit/2fd0655))
* Add en-x-pseudo language to support pseudolocalization in WebApp (#300) ([4d1be4a](https://github.com/box/box-content-preview/commit/4d1be4a))
* Update: Increase file size limit for range requests (#296) ([21f490f](https://github.com/box/box-content-preview/commit/21f490f))
* Update: use pixelDeviceRatio to choose canvas pixel size (#286) ([9e5489d](https://github.com/box/box-content-preview/commit/9e5489d))
* Mojito: Update translations (#290) ([deaf8f2](https://github.com/box/box-content-preview/commit/deaf8f2))
* Mojito: Update translations (#291) ([63a7201](https://github.com/box/box-content-preview/commit/63a7201))



<a name="1.5.0"></a>
# 1.5.0 (2017-08-09)

* New: 3D preview logic now loads from generated JSON file. ([4216b70](https://github.com/box/box-content-preview/commit/4216b70))
* New: Documentation for viewer methods (#263) ([48f681d](https://github.com/box/box-content-preview/commit/48f681d))
* Fix: Disable font face for iOS 10.3.x (#283) ([4d97d99](https://github.com/box/box-content-preview/commit/4d97d99))
* Fix: Only initialize PreviewUI.notification after viewer is loaded (#273) ([060687b](https://github.com/box/box-content-preview/commit/060687b))
* Chore: Cleaning up annotations methods in BaseViewer (#272) ([6f319f6](https://github.com/box/box-content-preview/commit/6f319f6))
* Chore: Force image point dialogs to re-position on re-render (#280) ([baf9b70](https://github.com/box/box-content-preview/commit/baf9b70))
* Chore: Removing references to annotations from individual viewers (#271) ([2a1e6cd](https://github.com/box/box-content-preview/commit/2a1e6cd))
* Chore: Removing references to constants.js and Browser.js in Annotations code (#277) ([8d37f37](https://github.com/box/box-content-preview/commit/8d37f37))
* Mojito: Update translations (#278) ([a02f3fe](https://github.com/box/box-content-preview/commit/a02f3fe))
* Update: move rbush from static to npm module (#275) ([cec5410](https://github.com/box/box-content-preview/commit/cec5410))



<a name="1.4.0"></a>
# 1.4.0 (2017-08-01)

* Chore: Duplicating any util.js methods used into annotatorUtil.js (#260) ([249e9f1](https://github.com/box/box-content-preview/commit/249e9f1))
* Chore: Initializing notifications in PreviewUI once rather than in each Annotator (#262) ([721ef4e](https://github.com/box/box-content-preview/commit/721ef4e))
* Chore: Removing initAnnotations() from DocBaseViewer (#259) ([b7cde84](https://github.com/box/box-content-preview/commit/b7cde84))
* Update: Add aria-pressed setting for CC button (#264) ([4c52531](https://github.com/box/box-content-preview/commit/4c52531))
* Fix: Don't trigger highlight if a new highlight is being created (#265) ([9ab6db4](https://github.com/box/box-content-preview/commit/9ab6db4))
* Fix: Emit scale does not always pass events (#261) ([41b1af0](https://github.com/box/box-content-preview/commit/41b1af0))
* Fix: Load annotator with the correct initial scale (#256) ([fc25534](https://github.com/box/box-content-preview/commit/fc25534))
* Fix: thread save incorrectly rejects when no dialogue exists (#247) ([6b361ed](https://github.com/box/box-content-preview/commit/6b361ed))
* Fix: Tweak release script ([d115c1c](https://github.com/box/box-content-preview/commit/d115c1c))
* Mojito: Update translations (#266) ([2ee12a3](https://github.com/box/box-content-preview/commit/2ee12a3))
* New: add annotation-noicon to allow native PDF annotations to be shown (#258) ([4de1259](https://github.com/box/box-content-preview/commit/4de1259))
* New: Add pseudo fullscreen to mobile Safari (#246) ([b8c776d](https://github.com/box/box-content-preview/commit/b8c776d))



<a name="1.3.0"></a>
# 1.3.0 (2017-07-28)

* Chore: Add github release notes in release script (#255) ([a2d2985](https://github.com/box/box-content-preview/commit/a2d2985))
* Chore: Default single page images to page 1 for annotations (#249) ([6080055](https://github.com/box/box-content-preview/commit/6080055))
* Chore: Modify patch release script (#250) ([afc51d3](https://github.com/box/box-content-preview/commit/afc51d3))
* Chore: Renaming AnnotationThread.thread to AnnotationThread.threadNumber (#241) ([66b1d7c](https://github.com/box/box-content-preview/commit/66b1d7c))
* Chore: Switch to git-based changelog generator (#252) ([35994b6](https://github.com/box/box-content-preview/commit/35994b6))
* Chore: Update patch release script (#251) ([f0fa0cf](https://github.com/box/box-content-preview/commit/f0fa0cf))
* Fix: Add clickHandlers back for all enabled annotation modes (#248) ([b3dd251](https://github.com/box/box-content-preview/commit/b3dd251))
* Fix: Don't trigger highlight dialogs while mouse is over another dialog (#242) ([af861cf](https://github.com/box/box-content-preview/commit/af861cf))
* Fix: Fix media query so 3D settings pullup is never truncated (#253) ([1ee02fe](https://github.com/box/box-content-preview/commit/1ee02fe)), closes [#253](https://github.com/box/box-content-preview/issues/253)
* Fix: Fix release script ([499c06b](https://github.com/box/box-content-preview/commit/499c06b))
* Fix: Hide filmstrip when controls hide (#239) ([0ba7804](https://github.com/box/box-content-preview/commit/0ba7804))
* Fix: Typo in release script ([01cdf3c](https://github.com/box/box-content-preview/commit/01cdf3c))



<a name="1.2.0"></a>
# 1.2.0 (2017-07-25)

* Release: 1.2.0 ([11b1802](https://github.com/box/box-content-preview/commit/11b1802))
* Fix: Allow legacy annotations to render in PDF.js (#238) ([ed3b5cb](https://github.com/box/box-content-preview/commit/ed3b5cb))
* Fix: Ensuring annotation scale is set on files without any annotations (#234) ([aa93d09](https://github.com/box/box-content-preview/commit/aa93d09))
* Fix: Give preview some min width and height (#237) ([20f6056](https://github.com/box/box-content-preview/commit/20f6056))
* Fix: Increase controls timeout and fix controls behavior for mobile VR (#235) ([1df8b55](https://github.com/box/box-content-preview/commit/1df8b55)), closes [#235](https://github.com/box/box-content-preview/issues/235)
* Fix: Update box3d to fix camera reload bug (#245) ([1e1495f](https://github.com/box/box-content-preview/commit/1e1495f)), closes [#245](https://github.com/box/box-content-preview/issues/245)
* Chore: Update translations (#240) ([cf1a799](https://github.com/box/box-content-preview/commit/cf1a799))
* New: added support for compressed (DDS) textures to 3D preview (#244) ([4b5e203](https://github.com/box/box-content-preview/commit/4b5e203))
* Feature: DrawingAnnotations starting code (#224) ([3960927](https://github.com/box/box-content-preview/commit/3960927))
* Docs: Adding section of using Preview as a component (#236) ([3c3eb06](https://github.com/box/box-content-preview/commit/3c3eb06))



<a name="1.1.1"></a>
## 1.1.1 (2017-07-20)

* Release: 1.1.1 ([9487634](https://github.com/box/box-content-preview/commit/9487634))
* Fix: Don't swallow touch start event to prevent iOS inertia scrolling (#233) ([d628c14](https://github.com/box/box-content-preview/commit/d628c14))
* Fix: Prevent MP3 from hiding (#230) ([2a236fe](https://github.com/box/box-content-preview/commit/2a236fe))



<a name="1.1.0"></a>
# 1.1.0 (2017-07-18)

* Release: 1.1.0 ([a8e1216](https://github.com/box/box-content-preview/commit/a8e1216))
* Docs: Add issue reporting template (#228) ([135e717](https://github.com/box/box-content-preview/commit/135e717))
* Docs: More README updates ([00821c4](https://github.com/box/box-content-preview/commit/00821c4))
* Docs: Update document viewer event name ([eae3c74](https://github.com/box/box-content-preview/commit/eae3c74))
* Docs: Update project status badge (#212) ([f50be16](https://github.com/box/box-content-preview/commit/f50be16))
* Docs: Update shield for UI Elements ([271cbbb](https://github.com/box/box-content-preview/commit/271cbbb))
* Docs: Update support section in README ([94c17d4](https://github.com/box/box-content-preview/commit/94c17d4))
* Fix: Limit iOS font fix to 10.3.1 (#225) ([b17054a](https://github.com/box/box-content-preview/commit/b17054a)), closes [#225](https://github.com/box/box-content-preview/issues/225)
* Fix: Media controls and usability fixes for mobile (#217) ([38ecce7](https://github.com/box/box-content-preview/commit/38ecce7)), closes [#217](https://github.com/box/box-content-preview/issues/217)
* Fix: Prevent double tap zoom in control bar (#227) ([14996a0](https://github.com/box/box-content-preview/commit/14996a0))
* Fix: Restore crawler for buffering video (#218) ([800692d](https://github.com/box/box-content-preview/commit/800692d))
* New: Add ts and flv formats to MediaLoader.js (#226) ([be35a75](https://github.com/box/box-content-preview/commit/be35a75))
* Update: Render Vera-protected HTML files (#220) ([78423ac](https://github.com/box/box-content-preview/commit/78423ac))
* Chore: Cleaning up annotation strings/classes (#215) ([0cfcaf7](https://github.com/box/box-content-preview/commit/0cfcaf7))
* Chore: Fix webpack errors and upgrade some packages (#221) ([c309da1](https://github.com/box/box-content-preview/commit/c309da1)), closes [#221](https://github.com/box/box-content-preview/issues/221)
* Chore: Full pass of prettier formatting (#223) ([814aa75](https://github.com/box/box-content-preview/commit/814aa75))
* Chore: Update .travis.yml to only build master (#214) ([f10b14c](https://github.com/box/box-content-preview/commit/f10b14c))
* Chore: Update Travis config (#219) ([a6fe4b6](https://github.com/box/box-content-preview/commit/a6fe4b6))
* Fix settings pullup for model3D files on mobile (#222) ([f285ba8](https://github.com/box/box-content-preview/commit/f285ba8)), closes [#222](https://github.com/box/box-content-preview/issues/222)



<a name="1.0.0"></a>
# 1.0.0 (2017-07-12)

* Release: 1.0.0 ([b599cd2](https://github.com/box/box-content-preview/commit/b599cd2))



<a name="0.131.2"></a>
## 0.131.2 (2017-07-11)

* Release: 0.131.2 ([1021c8e](https://github.com/box/box-content-preview/commit/1021c8e))
* Fix: Ensure that annotation scale is never being set to auto (#208) ([9899f94](https://github.com/box/box-content-preview/commit/9899f94))
* Fix: Search preview container for mobile annotations dialog (#209) ([56e026a](https://github.com/box/box-content-preview/commit/56e026a))



<a name="0.131.1"></a>
## 0.131.1 (2017-07-11)

* Release: 0.131.1 ([6eeb432](https://github.com/box/box-content-preview/commit/6eeb432))
* Fix: Properly scope typography CSS (#207) ([816ed15](https://github.com/box/box-content-preview/commit/816ed15))
* Chore: Cleaning up annotations code comments (#206) ([9e042c1](https://github.com/box/box-content-preview/commit/9e042c1))



<a name="0.131.0"></a>
# 0.131.0 (2017-07-07)

* Release: 0.131.0 ([5b8539f](https://github.com/box/box-content-preview/commit/5b8539f))
* Chore: Fix ESLint warnings (JSDoc cleanup) (#199) ([d4303aa](https://github.com/box/box-content-preview/commit/d4303aa)), closes [#199](https://github.com/box/box-content-preview/issues/199)
* Chore: Page num input uses numeric keyboard on mobile devices (#200) ([6acf8fa](https://github.com/box/box-content-preview/commit/6acf8fa))
* Chore: Preview Cleanup (#202) ([18e5969](https://github.com/box/box-content-preview/commit/18e5969))
* Chore: Preview UI as instance (#204) ([5d06fb3](https://github.com/box/box-content-preview/commit/5d06fb3))
* Chore: Remove padding for CSV files (#194) ([762896e](https://github.com/box/box-content-preview/commit/762896e))
* Chore: Removing unused 'active' & 'active-hover' states for annotations (#189) ([3c46e05](https://github.com/box/box-content-preview/commit/3c46e05))
* Chore: Scrubber/Media fixes for mobile (#185) ([884799c](https://github.com/box/box-content-preview/commit/884799c)), closes [#185](https://github.com/box/box-content-preview/issues/185)
* Chore: Update README to include token scope information (#203) ([a26d600](https://github.com/box/box-content-preview/commit/a26d600))
* Chore: Update to new 'Elements' branding (#193) ([4995798](https://github.com/box/box-content-preview/commit/4995798))
* Cleanup for 1.0 for 3D (#205) ([78c11f2](https://github.com/box/box-content-preview/commit/78c11f2))
* Fix/notification message timeout (#201) ([5d42af4](https://github.com/box/box-content-preview/commit/5d42af4))
* Fix: Allow panning on mobile while zooming into ppt files (#192) ([68091e3](https://github.com/box/box-content-preview/commit/68091e3))
* Fix: Ensures highlight buttons are hidden on mobile devices (#196) ([ef8db6e](https://github.com/box/box-content-preview/commit/ef8db6e))
* Fix: Tree shaking bug workaround for csv bundle (#191) ([edd11e4](https://github.com/box/box-content-preview/commit/edd11e4))
* Update: pdf.js 1.8.514 (#197) ([bf10569](https://github.com/box/box-content-preview/commit/bf10569))
* Docs: Update contributing.md (#195) ([08eb9e9](https://github.com/box/box-content-preview/commit/08eb9e9))



<a name="0.130.0"></a>
# 0.130.0 (2017-06-28)

* Release: 0.130.0 ([53527c0](https://github.com/box/box-content-preview/commit/53527c0))
* Fix: Buttons fail to display when adding a comment to plain highlight (#183) ([a344153](https://github.com/box/box-content-preview/commit/a344153))
* Fix: Fix focus for new page number input (#187) ([5f82f15](https://github.com/box/box-content-preview/commit/5f82f15)), closes [#187](https://github.com/box/box-content-preview/issues/187)
* Fix: Fix hiding on Android Chrome (#190) ([897abcd](https://github.com/box/box-content-preview/commit/897abcd)), closes [#190](https://github.com/box/box-content-preview/issues/190)
* Fix: Fixes issues with adding annotations on tablets (#186) ([e6e6c3b](https://github.com/box/box-content-preview/commit/e6e6c3b)), closes [#186](https://github.com/box/box-content-preview/issues/186)
* Fix: Sets the pdf scale after page render rather than on resize (#178) ([8457621](https://github.com/box/box-content-preview/commit/8457621))
* Create highlight dialog (#184) ([59c0bbb](https://github.com/box/box-content-preview/commit/59c0bbb))
* Chore: Add Webpack bundle visualizer (#188) ([8fa744e](https://github.com/box/box-content-preview/commit/8fa744e))
* Chore: Make page number input more visible (#179) ([3b585d8](https://github.com/box/box-content-preview/commit/3b585d8))
* Chore: Refactor controls for mobile (#174) ([066a3d4](https://github.com/box/box-content-preview/commit/066a3d4))
* New: Allowing users to add new mobile point annotations (#177) ([56bbbf9](https://github.com/box/box-content-preview/commit/56bbbf9))
* Update: Readme with new badges (#180) ([fc51f75](https://github.com/box/box-content-preview/commit/fc51f75))
* Update: Remove 0.25x playback on media files (#182) ([896c755](https://github.com/box/box-content-preview/commit/896c755))



<a name="0.129.2"></a>
## 0.129.2 (2017-06-20)

* Release: 0.129.2 ([ef39c99](https://github.com/box/box-content-preview/commit/ef39c99))
* Fix: Fix shared links previewed in other subdomains (#173) ([ab04be5](https://github.com/box/box-content-preview/commit/ab04be5)), closes [#173](https://github.com/box/box-content-preview/issues/173)
* Chore: Tweak fade-in timing of file loading animation (#175) ([1e9cebe](https://github.com/box/box-content-preview/commit/1e9cebe))
* Chore: Update ESLint rules and VSCode settings (#176) ([28ec823](https://github.com/box/box-content-preview/commit/28ec823))
* Docs: Update README editor plugins ([b0be367](https://github.com/box/box-content-preview/commit/b0be367))



<a name="0.129.1"></a>
## 0.129.1 (2017-06-16)

* Release: 0.129.1 ([d6f5878](https://github.com/box/box-content-preview/commit/d6f5878))
* Fix: Box3D bug prevented loading video texture from video tag ([55d3ca2](https://github.com/box/box-content-preview/commit/55d3ca2))



<a name="0.129.0"></a>
# 0.129.0 (2017-06-14)

* Release: 0.129.0 ([d38e6df](https://github.com/box/box-content-preview/commit/d38e6df))
* Mojito: Update translations (#167) ([4210077](https://github.com/box/box-content-preview/commit/4210077))
* New: File specific loading icons (#170) ([16af34d](https://github.com/box/box-content-preview/commit/16af34d))
* Fix: Catch loss of WebGL context in Box3D and reload preview ([0de993e](https://github.com/box/box-content-preview/commit/0de993e))
* Fix: Fix removeEventListener in MediaBaseViewer (#169) ([5760a12](https://github.com/box/box-content-preview/commit/5760a12)), closes [#169](https://github.com/box/box-content-preview/issues/169)
* Chore: Refactoring Controls for mobile (#159) ([98ad9cc](https://github.com/box/box-content-preview/commit/98ad9cc))



<a name="0.128.0"></a>
# 0.128.0 (2017-06-06)

* Release: 0.128.0 ([a0fc5ae](https://github.com/box/box-content-preview/commit/a0fc5ae))
* Upgrade: Upgrade Shaka-player to fix infinite 401 issue (#164) ([5646a79](https://github.com/box/box-content-preview/commit/5646a79)), closes [#164](https://github.com/box/box-content-preview/issues/164)
* Update: Add support for 'ly' Lilypond musical annotation files (#165) ([4212692](https://github.com/box/box-content-preview/commit/4212692))
* Update: Change Preview loading message (#166) ([a8457f0](https://github.com/box/box-content-preview/commit/a8457f0))
* Update: Displaying file type unsupported error (#163) ([59765e8](https://github.com/box/box-content-preview/commit/59765e8))
* Chore: Optimizations for highlightMousemoveEvent (#121) ([4d31542](https://github.com/box/box-content-preview/commit/4d31542))
* Chore: refactored and renamed getPageElAndPageNumber (#162) ([00dedab](https://github.com/box/box-content-preview/commit/00dedab))
* Animate annotation dialog (#161) ([b7217c6](https://github.com/box/box-content-preview/commit/b7217c6))
* Mojito: Update translations (#160) ([fbb3989](https://github.com/box/box-content-preview/commit/fbb3989))
* Docs: Use ISO date format for LICENSE (#158) ([e856302](https://github.com/box/box-content-preview/commit/e856302))



<a name="0.127.0"></a>
# 0.127.0 (2017-05-30)

* Release: 0.127.0 ([07d036f](https://github.com/box/box-content-preview/commit/07d036f))
* Fix: Disables annotations after 'load' event on shared links (#150) ([77cf5bb](https://github.com/box/box-content-preview/commit/77cf5bb))
* Fix: Ensure point annotation mode button is hidden on rotated images (#151) ([e322c6a](https://github.com/box/box-content-preview/commit/e322c6a))
* Fix: Error content jumps on error if download button is absent (#152) ([2cd6fed](https://github.com/box/box-content-preview/commit/2cd6fed))
* Fix: Image scaling/rotation is broken when an image has annotations (#156) ([c91e9f9](https://github.com/box/box-content-preview/commit/c91e9f9))
* Fix: Support disabling DASH viewer in DASH-supported environment (#140) ([b292666](https://github.com/box/box-content-preview/commit/b292666))
* Chore: Re-enabling controls for mobile viewers (#157) ([a9e1c52](https://github.com/box/box-content-preview/commit/a9e1c52))
* Chore: Use whatwg-fetch instead of isomorphic-fetch (#155) ([5a8f4f2](https://github.com/box/box-content-preview/commit/5a8f4f2))
* Mojito: Update translations (#154) ([2e512ed](https://github.com/box/box-content-preview/commit/2e512ed))
* New: Initial mobile optimization of annotation dialogs (#146) ([d693991](https://github.com/box/box-content-preview/commit/d693991))



<a name="0.126.1"></a>
## 0.126.1 (2017-05-26)

* Release: 0.126.1 ([e269605](https://github.com/box/box-content-preview/commit/e269605))
* Fix: Fixing vanity urls for excel online on IE11 (#153) ([ff6ae22](https://github.com/box/box-content-preview/commit/ff6ae22))
* Fix: Reinforcing release script (#148) ([c7137a0](https://github.com/box/box-content-preview/commit/c7137a0))
* Update: Make media viewer settings menu larger so scrollbars don't show (#149) ([7da7efc](https://github.com/box/box-content-preview/commit/7da7efc))
* Chore: Fix changelog (#144) ([be0d2b0](https://github.com/box/box-content-preview/commit/be0d2b0)), closes [#144](https://github.com/box/box-content-preview/issues/144)
* Chore: Format all source code with prettier (#143) ([d2a6835](https://github.com/box/box-content-preview/commit/d2a6835))
* Add toggle and metadata for box3d grid ([d139a15](https://github.com/box/box-content-preview/commit/d139a15))



<a name="0.126.0"></a>
# 0.126.0 (2017-05-24)

* Release: 0.126.0 ([22cd9b1](https://github.com/box/box-content-preview/commit/22cd9b1))
* Chore: Update translations (#142) ([b084505](https://github.com/box/box-content-preview/commit/b084505))



<a name="0.125.0"></a>
# 0.125.0 (2017-05-24)

* Release: 0.125.0 ([b77af71](https://github.com/box/box-content-preview/commit/b77af71))
* Build: Update build script to tag release commits (#141) ([15c0034](https://github.com/box/box-content-preview/commit/15c0034))
* Chore: Add prettier code formatter (#133) ([c3cb7b6](https://github.com/box/box-content-preview/commit/c3cb7b6))
* Chore: Deleting old third-party packages (#127) ([d45bb83](https://github.com/box/box-content-preview/commit/d45bb83))
* Chore: Settings.js - Declare class properties at class-level (#134) ([2cacedd](https://github.com/box/box-content-preview/commit/2cacedd))
* Chore: Update license formatting (#135) ([61b8bbd](https://github.com/box/box-content-preview/commit/61b8bbd))
* Chore: Update prettier line width to 80 (#139) ([e7fb14b](https://github.com/box/box-content-preview/commit/e7fb14b))
* Chore: Update translations (#132) ([f5fc6a5](https://github.com/box/box-content-preview/commit/f5fc6a5))
* Update: Adding more languages for subtitles (#130) ([b55988c](https://github.com/box/box-content-preview/commit/b55988c))
* Update: Improve subtitle selection algorithm (#129) ([561cb73](https://github.com/box/box-content-preview/commit/561cb73))
* Update: Show rate limit specific error message when a 429 occurs (#137) ([67b589c](https://github.com/box/box-content-preview/commit/67b589c))
* Update: Some UI changes for video player (#128) ([81802c1](https://github.com/box/box-content-preview/commit/81802c1))
* Update: Update Box3D with new material default (#136) ([97fe7a1](https://github.com/box/box-content-preview/commit/97fe7a1))
* Fix: fix excel setup when enabling the Office viewer via options (#126) ([e8145f5](https://github.com/box/box-content-preview/commit/e8145f5)), closes [#126](https://github.com/box/box-content-preview/issues/126)
* Fix: Seek time doesn't match filmstrip timecode (#131) ([fb1fdd0](https://github.com/box/box-content-preview/commit/fb1fdd0))
* Docs: Update changelog ([0a19275](https://github.com/box/box-content-preview/commit/0a19275))
* Docs: Update Contributing.md (#125) ([d717883](https://github.com/box/box-content-preview/commit/d717883))
* Docs: Update license to Box Software License Agreement (#124) ([b8c6080](https://github.com/box/box-content-preview/commit/b8c6080))
* Docs: Update README to point to new CodePen demo ([5e20db3](https://github.com/box/box-content-preview/commit/5e20db3))
* Mojito: Update translations (#123) ([86c8475](https://github.com/box/box-content-preview/commit/86c8475))



<a name="0.124.0"></a>
# 0.124.0 (2017-05-17)

* 0.124.0 ([e7fd504](https://github.com/box/box-content-preview/commit/e7fd504))



<a name="0.123.0"></a>
# 0.123.0 (2017-05-17)

* 0.123.0 ([cdd3799](https://github.com/box/box-content-preview/commit/cdd3799))
* Update: Adding iso639 code translations (#122) ([b4de2a6](https://github.com/box/box-content-preview/commit/b4de2a6))
* New: Multi image annotations post bundling refactor ([93a5ba2](https://github.com/box/box-content-preview/commit/93a5ba2))
* New: platform excel online fork (#101) ([a247b9d](https://github.com/box/box-content-preview/commit/a247b9d))
* New: Support closed-captions/subtitles (#117) ([4c56532](https://github.com/box/box-content-preview/commit/4c56532))
* Chore: Bundling annotations.css separately from preview.css (#106) ([699ed56](https://github.com/box/box-content-preview/commit/699ed56))
* Chore: Document viewer tweaks (#114) ([5d0f884](https://github.com/box/box-content-preview/commit/5d0f884))
* Chore: Moving common annotation methods into Base classes (#111) ([27a908a](https://github.com/box/box-content-preview/commit/27a908a))
* Chore: Remove unnecessary mobile check (#120) ([7268548](https://github.com/box/box-content-preview/commit/7268548))
* Chore: Tweak readme on self-hosted vs Box-hosted ([104d03e](https://github.com/box/box-content-preview/commit/104d03e))
* Chore: Update readme section on Promise polyfills ([7c90078](https://github.com/box/box-content-preview/commit/7c90078))
* Fix: Dont rely on preview's script tag being present after execution (#105) ([3ae639a](https://github.com/box/box-content-preview/commit/3ae639a))
* Fix: Issue when 'load' event is fired before BoxAnnotations is loaded (#108) ([b4c8d32](https://github.com/box/box-content-preview/commit/b4c8d32))
* Fix: Older versions of webkit iOS incorrectly cache range requests (#118) ([0424e16](https://github.com/box/box-content-preview/commit/0424e16))
* Fix: Set media viewers' settings menu dimensions with javascript (#116) ([3c36f0a](https://github.com/box/box-content-preview/commit/3c36f0a))
* Docs: Remove unneeded file types from image360 docs (#119) ([0b7d8de](https://github.com/box/box-content-preview/commit/0b7d8de))
* Mojito: Update translations (#113) ([7c12442](https://github.com/box/box-content-preview/commit/7c12442))
* Upgrade: Upgrade Shaka-player to 2.1.1 (#110) ([4387245](https://github.com/box/box-content-preview/commit/4387245))



<a name="0.122.0"></a>
# 0.122.0 (2017-05-09)

* 0.122.0 ([c735f38](https://github.com/box/box-content-preview/commit/c735f38))
* Mojito: Update translations (#107) ([197945d](https://github.com/box/box-content-preview/commit/197945d))
* Chore: Allow console logging to show in tests (#100) ([b0e15b1](https://github.com/box/box-content-preview/commit/b0e15b1))
* Chore: cleaning up DocBaseViewer (#103) ([9d444b3](https://github.com/box/box-content-preview/commit/9d444b3))
* Chore: Remove font-smoothing and update progress bar color (#104) ([2581b88](https://github.com/box/box-content-preview/commit/2581b88))
* Chore: Remove unused 'parent' field from Box File object (#91) ([1f9a94b](https://github.com/box/box-content-preview/commit/1f9a94b))
* Update: Make media player web-accessible according to WCAG2.0 spec (#97) ([687dba4](https://github.com/box/box-content-preview/commit/687dba4))
* Update: Re-enable font loading API support check (#99) ([eca9e6d](https://github.com/box/box-content-preview/commit/eca9e6d))
* Fix: Add Annotations bundling changes back  (#95) ([bbc6ea3](https://github.com/box/box-content-preview/commit/bbc6ea3))
* Fix: Make all svgs not focusable (#98) ([edcf0e1](https://github.com/box/box-content-preview/commit/edcf0e1))



<a name="0.121.1"></a>
## 0.121.1 (2017-04-29)

* 0.121.1 ([948fbf8](https://github.com/box/box-content-preview/commit/948fbf8))
* Revert annotations bundling (#94) ([176ad13](https://github.com/box/box-content-preview/commit/176ad13))



<a name="0.121.0"></a>
# 0.121.0 (2017-04-25)

* 0.121.0 ([3e1e045](https://github.com/box/box-content-preview/commit/3e1e045))
* Chore: Add console logging to better debug hanging preview (#93) ([3e6299b](https://github.com/box/box-content-preview/commit/3e6299b))
* Chore: Bundling Annotators separately in annotations.js (#75) ([efa8b2a](https://github.com/box/box-content-preview/commit/efa8b2a))
* Chore: Do not load annotations on shared links (#88) ([8b959cd](https://github.com/box/box-content-preview/commit/8b959cd))
* Chore: Removed underscored variables and getters from all annotation files (#83) ([ac838d2](https://github.com/box/box-content-preview/commit/ac838d2))
* Chore: User agent refactor and Browser tests (#87) ([059f6ac](https://github.com/box/box-content-preview/commit/059f6ac))
* Fix: Don't load preload if the rep has an error (#92) ([ab5c65a](https://github.com/box/box-content-preview/commit/ab5c65a))
* Fix: Ensuring annotations are loaded when viewer has permissions (#90) ([b90cdde](https://github.com/box/box-content-preview/commit/b90cdde))
* Update: Document viewer optimizations (#89) ([41560d6](https://github.com/box/box-content-preview/commit/41560d6))
* Upgrade: Shaka Player 2.0.8 (#85) ([461070d](https://github.com/box/box-content-preview/commit/461070d))



<a name="0.120.1"></a>
## 0.120.1 (2017-04-19)

* 0.120.1 ([35be0a5](https://github.com/box/box-content-preview/commit/35be0a5))
* Update: Tweak pdf.js range requests for improved performance (#84) ([0e7f358](https://github.com/box/box-content-preview/commit/0e7f358))



<a name="0.120.0"></a>
# 0.120.0 (2017-04-18)

* 0.120.0 ([85337bc](https://github.com/box/box-content-preview/commit/85337bc))
* Fix: Handle text representation error (#72) ([81fc4e4](https://github.com/box/box-content-preview/commit/81fc4e4))
* Fix: Only bind custom listeners when annotation threads exist (#74) ([1e2e9f7](https://github.com/box/box-content-preview/commit/1e2e9f7))
* Fix: Prevent webGL error when prefetching Preview.js (#82) ([e0a420a](https://github.com/box/box-content-preview/commit/e0a420a))
* Update: Add client information to performance logging (#80) ([f7bea68](https://github.com/box/box-content-preview/commit/f7bea68))
* Update: Add disableTextLayer option for doc and text viewers (#71) ([a36f735](https://github.com/box/box-content-preview/commit/a36f735))
* Update: Changing analytics client name to 'box-content-preview' (#79) ([983dda9](https://github.com/box/box-content-preview/commit/983dda9))
* Update: Disabling font loading API for pdf.js to prevent glitches (#68) ([5b5807b](https://github.com/box/box-content-preview/commit/5b5807b))
* Chore: Mock super.setup() in all Viewer unit tests (#81) ([fec384c](https://github.com/box/box-content-preview/commit/fec384c))
* Chore: Rename test-html files and update fixture loading (#78) ([8285e39](https://github.com/box/box-content-preview/commit/8285e39))
* Chore: Triggering point annotation mode by emitting a message (#77) ([cc3e283](https://github.com/box/box-content-preview/commit/cc3e283))
* Chore: Updating annotations icons to the new Box blue (#76) ([979e129](https://github.com/box/box-content-preview/commit/979e129))
* Mojito: Update translations (#70) ([5daa11e](https://github.com/box/box-content-preview/commit/5daa11e))



<a name="0.119.1"></a>
## 0.119.1 (2017-04-12)

* 0.119.1 ([bc9b581](https://github.com/box/box-content-preview/commit/bc9b581))
* Fix: adding patch to options check in release script (#69) ([86c3fef](https://github.com/box/box-content-preview/commit/86c3fef))
* Fix: updating metadata from repStatus (#60) ([51143b0](https://github.com/box/box-content-preview/commit/51143b0))



<a name="0.119.0"></a>
# 0.119.0 (2017-04-11)

* 0.119.0 ([762fad8](https://github.com/box/box-content-preview/commit/762fad8))
* Fix: Hiding download button in all cases if browser cannot download (#61) ([3a5bb41](https://github.com/box/box-content-preview/commit/3a5bb41))
* Fix: Temporary disableFontFaces on IOS 10.3 ([67de2d7](https://github.com/box/box-content-preview/commit/67de2d7))
* Update: Decrease mobile web max pdf.js canvas size to 3MP (#66) ([88304c9](https://github.com/box/box-content-preview/commit/88304c9))
* Update: Increase default doc chunk size to 384KB (#64) ([ebbaccd](https://github.com/box/box-content-preview/commit/ebbaccd))
* Update: Upgrade pdf.js to v1.8.175 (#63) ([14ac6f9](https://github.com/box/box-content-preview/commit/14ac6f9))
* Chore: Removing unneeded compatibility.js from pdf.js (#65) ([82d582e](https://github.com/box/box-content-preview/commit/82d582e))
* Chore: Update changelog generator to ignore old pull requests (#59) ([7ad5088](https://github.com/box/box-content-preview/commit/7ad5088))



<a name="0.118.0"></a>
# 0.118.0 (2017-04-06)

* 0.118.0 ([930c432](https://github.com/box/box-content-preview/commit/930c432))
* Chore: Moving existing CHANGELOG.md to HISTORY.md ([126f78d](https://github.com/box/box-content-preview/commit/126f78d))
* Chore: Updating README describing .conventional-changelog-lintrc (#57) ([897b858](https://github.com/box/box-content-preview/commit/897b858))
* Update: New Box-branding for Oculus Touch models (#58) ([59880de](https://github.com/box/box-content-preview/commit/59880de))



<a name="0.117.0"></a>
# 0.117.0 (2017-04-06)

* New: Initial push to GitHub ([448c477](https://github.com/box/box-content-preview/commit/448c477))



