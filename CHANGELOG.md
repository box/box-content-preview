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



