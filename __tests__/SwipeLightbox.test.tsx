import { render, screen, fireEvent } from "@testing-library/react";
import { SwipeLightbox } from "@/components/shared/SwipeLightbox";

const IMAGES = [
  { id: "a", imageUrl: "https://cdn.example/a.jpg" },
  { id: "b", imageUrl: "https://cdn.example/b.jpg" },
  { id: "c", imageUrl: "https://cdn.example/c.jpg" },
];

describe("SwipeLightbox", () => {
  it("renders counter at start index", () => {
    render(<SwipeLightbox images={IMAGES} startIndex={1} onClose={() => {}} />);
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("invokes onClose when Close button is clicked", () => {
    const onClose = jest.fn();
    render(<SwipeLightbox images={IMAGES} startIndex={0} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("invokes onClose when Escape is pressed", () => {
    const onClose = jest.fn();
    render(<SwipeLightbox images={IMAGES} startIndex={0} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("advances index on ArrowRight", () => {
    render(<SwipeLightbox images={IMAGES} startIndex={0} onClose={() => {}} />);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("does not advance past the last image", () => {
    render(<SwipeLightbox images={IMAGES} startIndex={2} onClose={() => {}} />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  it("omits Delete button when onDelete is not provided", () => {
    render(<SwipeLightbox images={IMAGES} startIndex={0} onClose={() => {}} />);
    expect(screen.queryByLabelText("Delete")).not.toBeInTheDocument();
  });
});
