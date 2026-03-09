import './HeartLoader.css';

/**
 * Full-screen heart animation loader.
 * Drop in anywhere you'd show a loading spinner.
 */
export default function HeartLoader() {
    return (
        <div className="heart-loader-overlay">
            <div className="preloader-wrapper">
                <div className="heart-preloader">
                    <span />
                    <span />
                    <span />
                </div>
                <div className="heart-shadow" />
            </div>
        </div>
    );
}
