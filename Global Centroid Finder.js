/* Center of Gravity Finder with Global Centroid Calculation

This script will find the center of gravity (centroid) of all closed paths in the selection set, including compound and grouped shapes, using accurate area-weighted calculations for compound shapes. Additionally, it calculates the global centroid for all selected objects and marks it with an arrow pointing up.

Save this file with a .jsx extension and place in your Illustrator/Presets/en_US/Scripts folder. Access it from the File > Scripts menu.
*/

var holeDiameter = 0.125 * 72; // Diameter of the centroid marker in points
var arrowHeight = 0.25 * 72; // Height of the arrow in points
var arrowWidth = 0.125 * 72; // Width of the arrow base in points

if (app.documents.length > 0 && app.activeDocument.selection.length > 0) {
    var doc = app.activeDocument;
    var selection = doc.selection;

    // Variables for global centroid calculation
    var totalArea = 0;
    var weightedCx = 0;
    var weightedCy = 0;
    var debugMessages = [];

    // Function to calculate the signed area and centroid of a single path
    function calculateSignedCentroid(path) {
        var area = 0, cx = 0, cy = 0;
        var points = path.pathPoints;

        for (var i = 0; i < points.length; i++) {
            var p1 = points[i];
            var p2 = points[(i + 1) % points.length];
            var factor = p1.anchor[0] * p2.anchor[1] - p2.anchor[0] * p1.anchor[1];
            area += factor;
            cx += (p1.anchor[0] + p2.anchor[0]) * factor;
            cy += (p1.anchor[1] + p2.anchor[1]) * factor;
        }

        area /= 2;
        if (area !== 0) {
            cx = cx / (6 * area);
            cy = cy / (6 * area);
        } else {
            debugMessages.push("Warning: Path with zero area skipped.");
        }

        return { x: cx, y: cy, signedArea: area };
    }

    // Function to calculate the centroid of a compound path accurately based on signed areas
    function calculateCompoundCentroid(compoundPath) {
        var totalSignedArea = 0;
        var weightedCx = 0;
        var weightedCy = 0;

        for (var i = 0; i < compoundPath.pathItems.length; i++) {
            var path = compoundPath.pathItems[i];
            if (path.closed) {
                var centroid = calculateSignedCentroid(path);
                totalSignedArea += centroid.signedArea;
                weightedCx += centroid.x * centroid.signedArea;
                weightedCy += centroid.y * centroid.signedArea;
            }
        }

        if (Math.abs(totalSignedArea) > 0) {
            return { x: weightedCx / totalSignedArea, y: weightedCy / totalSignedArea, signedArea: totalSignedArea };
        }
        return null;
    }

    // Function to add a marker at the given coordinates
    function addMarker(x, y, isGlobal) {
        try {
            if (isGlobal) {
                // Draw an arrow pointing up for the global centroid
                var arrow = doc.pathItems.add();
                arrow.setEntirePath([
                    [x, y],
                    [x - arrowWidth / 2, y - arrowHeight],
                    [x + arrowWidth / 2, y - arrowHeight],
                    [x, y]
                ]);
                arrow.closed = true;
                arrow.filled = true;
                var fillColor = new RGBColor();
                fillColor.red = 255; // Red for the arrow
                fillColor.green = 0;
                fillColor.blue = 0;
                arrow.fillColor = fillColor;
                arrow.stroked = false;
            } else {
                // Draw a small circle for individual centroids
                var circle = doc.pathItems.ellipse(
                    y + holeDiameter / 2, // Top coordinate
                    x - holeDiameter / 2, // Left coordinate
                    holeDiameter, // Width
                    holeDiameter // Height
                );
                circle.stroked = false;
                circle.filled = true;
                var fillColor = new RGBColor();
                fillColor.red = 0; // Black for individual centroids
                fillColor.green = 0;
                fillColor.blue = 0;
                circle.fillColor = fillColor;
            }
        } catch (e) {
            debugMessages.push("Error: Failed to add marker at (" + x + ", " + y + ").");
        }
    }

    // Recursive function to process paths and compound paths correctly
    function processItem(item) {
        if (item.typename === "PathItem" && item.closed) {
            // Simple closed path
            var result = calculateSignedCentroid(item);
            if (result.signedArea > 0) {
                addMarker(result.x, result.y, false);
                return result;
            }
        } else if (item.typename === "CompoundPathItem") {
            // Treat compound path as a single object
            var compoundCentroid = calculateCompoundCentroid(item);
            if (compoundCentroid) {
                addMarker(compoundCentroid.x, compoundCentroid.y, false);
                return compoundCentroid;
            }
        } else {
            debugMessages.push("Skipped unsupported object type: " + item.typename);
        }
        return null;
    }

    // Process all selected objects
    for (var i = 0; i < selection.length; i++) {
        var result = processItem(selection[i]);
        if (result) {
            // Update global centroid calculations
            weightedCx += result.x * result.signedArea;
            weightedCy += result.y * result.signedArea;
            totalArea += result.signedArea;
        }
    }

    // Calculate and mark the global centroid
    if (totalArea > 0) {
        var globalCx = weightedCx / totalArea; // Weighted average for X
        var globalCy = weightedCy / totalArea; // Weighted average for Y

        // Debugging: Log total area and weighted coordinates
        debugMessages.push("Total Area: " + totalArea);
        debugMessages.push("Weighted Cx: " + weightedCx);
        debugMessages.push("Weighted Cy: " + weightedCy);
        debugMessages.push("Calculated Global Centroid: (" + globalCx + ", " + globalCy + ")");

        // Mark the global centroid with an arrow
        addMarker(globalCx, globalCy, true);
        debugMessages.push("Global centroid marked at (" + globalCx + ", " + globalCy + ").");
    } else {
        debugMessages.push("No valid closed paths found for global centroid calculation.");
    }

    // Provide feedback to the user
    alert("Centroids marked. Debug messages:\n\n" + debugMessages.join("\n"));
} else {
    alert("Please select one or more objects.");
}
