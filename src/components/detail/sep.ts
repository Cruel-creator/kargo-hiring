/**
 * Inline meta lists ("Product Manager · Uploaded …"). Each item carries its "·" in a 20px left gutter;
 * the row is shifted 20px left inside an overflow-x-clip box, so whichever item starts a line has its
 * dot clipped away. No line ever starts or ends on a separator, at any width.
 *
 *   <div className="overflow-x-clip"><div className={SEP_ROW}><span className={SEP}>…</span>…</div></div>
 */
export const SEP_ROW = "-ml-5 flex flex-wrap items-center gap-y-1";
export const SEP = "relative pl-5 before:absolute before:left-0 before:w-5 before:text-center before:text-faint before:content-['·'_/_'']";
