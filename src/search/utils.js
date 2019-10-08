function calculateItemsSize(numItems, itemHeight) {
  return Math.ceil(numItems / 3) * itemHeight;
}

function calculateSize(view, headerHeight, footerHeight, itemHeight) {
  return calculateItemsSize(view.referenceCollection.length, itemHeight)
    + headerHeight + footerHeight;
}

export function setSlice(offset, sliceHeight, view, headerHeight, footerHeight, itemHeight) {
  // search results and download list items get rendered only if in visible area
  // variable height transparent spacer on top and bottom is updated to allow scrolling through a list
  // using a concept of referenceCollection (all results) and actual rendered collection
  const size = calculateSize(view, headerHeight, footerHeight, itemHeight);
  const numItems = view.referenceCollection.length;
  let first = 0;
  let last = 0;
  if (offset + size < 0 // this view is completely above the current window
      || offset > sliceHeight) { // this view is completely below the current window
    first = last = numItems;
  } else {
    const firstOffset = offset + headerHeight;
    if (firstOffset < -itemHeight) {
      const firstRow = Math.floor(Math.abs(firstOffset) / itemHeight);
      first = firstRow * 3;
    }
    const lastRow = Math.ceil(Math.abs(-firstOffset + sliceHeight) / itemHeight);
    last = lastRow * 3;
  }
  view.collection.set(view.referenceCollection.slice(first, last));
  view.$('.spacer-top').css('height', Math.ceil(first / 3) * itemHeight);
  view.$('.spacer-bottom').css('height', Math.ceil((numItems - last) / 3) * itemHeight);
}
/*
                  /----------\        -
  headerHeight    |  title   |        |
                  |          |        |- scrollTop
                  |          |        |
                /----------------\    - -
                | |          |   |    | |
                | |          | = |    | |- offset
                | |          | = |    | |
                | \----------/ = |    | -
                | /----------\ = |    |
                | |  title   | = |    |- sliceHeight
                | \----------/ = |    |
                | /----------\   |    |
                | |  title   |   |    |
                | |          |   |    |
                \----------------/    -
                  |          |
                  |          |
                  \----------/


                  /----------\        -
  headerHeight    |  title   |        |
                  |          |        |- scrollTop
                  |          |        |
                /----------------\    - -
                | |          |   |    | |
                | |          | = |    | |- offset + titleHeight
                | |          | = |    | |
                | \----------/ = |    | |
                | /----------\ = |    | |
                | |  title   | = |    | |
                | |          |   |    | -
                | |          |   |    |
                | |          |   |    |
                | |          |   |    |
                | \----------/   |    |
                | /----------\   |    |
                | |  title   |   |    |
                | |          |   |    |
                \----------------/    -
                  |          |
                  |          |
                  \----------/
*/
